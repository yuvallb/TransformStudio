import * as Comlink from 'comlink';

import type {
  ExecutePipelineRequest,
  ExecutePipelineResult,
  KernelStatus,
  LoadCsvOptions,
  LoadCsvResult,
  RunPythonResult,
  StructuredError,
} from '@/lib/types';

import type { KernelApi } from '@/worker/pyodide.worker';

const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_TIMEOUT_MS = 30000;

export function parsePythonError(err: unknown): StructuredError {
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const message =
      typeof record.message === 'string'
        ? record.message
        : err instanceof Error
          ? err.message
          : String(err);
    const traceback = typeof record.traceback === 'string' ? record.traceback : undefined;
    return { message, traceback };
  }

  return { message: String(err) };
}

type StatusListener = (status: KernelStatus) => void;
type ProgressListener = (stage: string) => void;

export class KernelClient {
  private worker: Worker | null = null;
  private api: Comlink.Remote<KernelApi> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastPongAt = 0;
  private status: KernelStatus = 'idle';
  private progressStage = '';
  private statusListeners = new Set<StatusListener>();
  private progressListeners = new Set<ProgressListener>();
  private initPromise: Promise<void> | null = null;

  getStatus(): KernelStatus {
    return this.status;
  }

  getProgressStage(): string {
    return this.progressStage;
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  subscribeProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    listener(this.progressStage);
    return () => this.progressListeners.delete(listener);
  }

  private setStatus(status: KernelStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private setProgress(stage: string): void {
    this.progressStage = stage;
    for (const listener of this.progressListeners) {
      listener(stage);
    }
  }

  private createWorker(): void {
    this.worker = new Worker(new URL('../worker/pyodide.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.onerror = (event) => {
      console.error('Worker error:', event.message);
      this.handleCrash(event.message || 'Worker error');
    };

    this.worker.onmessageerror = () => {
      console.error('Worker message error');
      this.handleCrash('Worker message error');
    };

    this.api = Comlink.wrap<KernelApi>(this.worker);
    this.lastPongAt = Date.now();
    this.startHeartbeat();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      void this.checkHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async checkHeartbeat(): Promise<void> {
    if (!this.api) {
      return;
    }

    try {
      await this.api.ping();
      this.lastPongAt = Date.now();
    } catch (err) {
      console.error('Heartbeat ping failed:', err);
      this.handleCrash('Heartbeat failed');
    }

    if (Date.now() - this.lastPongAt > HEARTBEAT_TIMEOUT_MS) {
      this.handleCrash('Worker unresponsive');
    }
  }

  private handleCrash(reason: string): void {
    if (this.status === 'crashed') {
      return;
    }

    console.error('Python worker crashed:', reason);
    this.setStatus('crashed');
    this.stopHeartbeat();
    this.terminateWorkerOnly();
  }

  private terminateWorkerOnly(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.api = null;
    }
  }

  terminate(): void {
    this.stopHeartbeat();
    this.terminateWorkerOnly();
    this.initPromise = null;
    this.setProgress('');
    this.setStatus('idle');
  }

  async init(): Promise<void> {
    if (this.status === 'ready' && this.api) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.setStatus('loading');
    this.setProgress('Starting…');

    if (!this.worker || !this.api) {
      this.createWorker();
    }

    const api = this.api!;

    this.initPromise = api
      .init(
        Comlink.proxy((stage: string) => {
          this.setProgress(stage);
        }),
      )
      .then(() => {
        this.setStatus('ready');
        this.setProgress('Ready');
      })
      .catch((err: unknown) => {
        this.setStatus('error');
        this.setProgress('Error');
        this.initPromise = null;
        throw err;
      });

    return this.initPromise;
  }

  async restart(): Promise<void> {
    this.terminate();
    await this.init();
  }

  async runPython(code: string): Promise<RunPythonResult> {
    await this.init();

    if (!this.api) {
      return { error: { message: 'Worker not available' } };
    }

    const result = await this.api.runPython(code);

    if (result.error) {
      return { error: parsePythonError(result.error) };
    }

    return result;
  }

  async loadCsv(bytes: Uint8Array, options?: LoadCsvOptions): Promise<LoadCsvResult> {
    await this.init();

    if (!this.api) {
      return { error: { message: 'Worker not available' } };
    }

    const result = await this.api.loadCsv(bytes, options ?? {});

    if (result.error) {
      return { error: parsePythonError(result.error) };
    }

    return result;
  }

  async ping(): Promise<number> {
    if (!this.api) {
      this.createWorker();
    }

    return this.api!.ping();
  }

  async executePipeline(request: ExecutePipelineRequest): Promise<ExecutePipelineResult> {
    await this.init();

    if (!this.api) {
      return { nodeResults: {}, error: { message: 'Worker not available' } };
    }

    const result = await this.api.executePipeline(request);

    if (result.error) {
      return {
        nodeResults: result.nodeResults,
        error: parsePythonError(result.error),
      };
    }

    return result;
  }
}

export const kernelClient = new KernelClient();
