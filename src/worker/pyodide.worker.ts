import * as Comlink from 'comlink';
import { loadPyodide, version, type PyodideInterface } from 'pyodide';

import type {
  ExecutePipelineRequest,
  ExecutePipelineResult,
  LoadCsvOptions,
  LoadCsvResult,
  RunPythonResult,
  StructuredError,
} from '@/lib/types';

import { executePipeline } from './kernel';
import { getPythonHelpers } from './python/helpers';

let pyodide: PyodideInterface | null = null;
let initPromise: Promise<void> | null = null;

function parsePythonException(err: unknown): StructuredError {
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

function toSerializable(value: unknown): unknown {
  if (value && typeof value === 'object' && 'toJs' in value) {
    return (value as { toJs: (opts?: object) => unknown }).toJs({
      dict_converter: Object.fromEntries,
      create_proxies: false,
    });
  }

  return value;
}

async function doInit(onProgress?: (stage: string) => void): Promise<void> {
  onProgress?.('Loading Pyodide…');

  // Official CDN per https://pyodide.org/en/stable/usage/downloading-and-deploying.html
  const indexURL = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;
  pyodide = await loadPyodide({ indexURL });

  onProgress?.('Loading pandas…');
  await pyodide.loadPackage(['pandas', 'numpy']);

  onProgress?.('Configuring pandas…');
  // Pandas 3+ (Pyodide 314) enables Copy-on-Write by default; no option needed.
  pyodide.runPython('import pandas as pd');

  pyodide.runPython(getPythonHelpers());
  onProgress?.('Ready');
}

async function ensureInit(onProgress?: (stage: string) => void): Promise<PyodideInterface> {
  if (pyodide) {
    return pyodide;
  }

  if (!initPromise) {
    initPromise = doInit(onProgress).catch((err) => {
      initPromise = null;
      pyodide = null;
      throw err;
    });
  }

  await initPromise;
  return pyodide!;
}

function buildReadCsvArgs(options: LoadCsvOptions): string {
  const parts: string[] = [];

  if (options.delimiter !== undefined) {
    parts.push(`sep=${JSON.stringify(options.delimiter)}`);
  }

  if (options.header !== undefined) {
    parts.push(options.header ? 'header=0' : 'header=None');
  }

  if (options.encoding !== undefined) {
    parts.push(`encoding=${JSON.stringify(options.encoding)}`);
  }

  return parts.length > 0 ? `, ${parts.join(', ')}` : '';
}

const kernelApi = {
  async init(onProgress?: (stage: string) => void): Promise<void> {
    await ensureInit(onProgress);
  },

  async ping(): Promise<number> {
    return Date.now();
  },

  async runPython(code: string): Promise<RunPythonResult> {
    try {
      const api = await ensureInit();
      const result = api.runPython(code);
      return { result: toSerializable(result) };
    } catch (err) {
      return { error: parsePythonException(err) };
    }
  },

  async loadCsv(bytes: Uint8Array, options: LoadCsvOptions = {}): Promise<LoadCsvResult> {
    try {
      const api = await ensureInit();
      api.FS.writeFile('/tmp/data.csv', bytes);

      const readArgs = buildReadCsvArgs(options);
      const code = `preview_df(pd.read_csv('/tmp/data.csv'${readArgs}))`;
      const preview = api.runPython(code);

      return { preview: toSerializable(preview) as LoadCsvResult['preview'] };
    } catch (err) {
      return { error: parsePythonException(err) };
    }
  },

  async executePipeline(request: ExecutePipelineRequest): Promise<ExecutePipelineResult> {
    try {
      const api = await ensureInit();
      const result = await executePipeline(api, request);
      const serializedResults: ExecutePipelineResult['nodeResults'] = {};

      for (const [nodeId, state] of Object.entries(result.nodeResults)) {
        serializedResults[nodeId] = {
          ...state,
          preview: state.preview ? (toSerializable(state.preview) as typeof state.preview) : null,
        };
      }

      return { nodeResults: serializedResults, error: result.error };
    } catch (err) {
      return {
        nodeResults: {},
        error: parsePythonException(err),
      };
    }
  },
};

Comlink.expose(kernelApi);

export type KernelApi = typeof kernelApi;
