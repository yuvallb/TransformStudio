import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

import { kernelClient } from '@/engine/kernel-client';
import { restoreWorkflowFromStorage } from '@/hooks/useWorkflow';
import type {
  KernelStatus,
  LoadCsvOptions,
  LoadCsvResult,
  RunPythonResult,
  StructuredError,
} from '@/lib/types';

interface PyodideContextValue {
  status: KernelStatus;
  progressStage: string;
  lastError: StructuredError | null;
  init: () => Promise<void>;
  runPython: (code: string) => Promise<RunPythonResult>;
  loadCsv: (bytes: Uint8Array, options?: LoadCsvOptions) => Promise<LoadCsvResult>;
  restart: () => Promise<void>;
}

const PyodideContext = createContext<PyodideContextValue | null>(null);

export function PyodideProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<KernelStatus>(kernelClient.getStatus());
  const [progressStage, setProgressStage] = useState(kernelClient.getProgressStage());
  const [lastError, setLastError] = useState<StructuredError | null>(null);

  useEffect(() => {
    return kernelClient.subscribeStatus(setStatus);
  }, []);

  useEffect(() => {
    return kernelClient.subscribeProgress(setProgressStage);
  }, []);

  useEffect(() => {
    if (status !== 'crashed') {
      return;
    }

    toast.error('Python runtime crashed. Restarting…');

    void (async () => {
      try {
        await kernelClient.restart();
        await restoreWorkflowFromStorage();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setLastError({ message });
        toast.error(`Failed to restart Python runtime: ${message}`);
      }
    })();
  }, [status]);

  const init = useCallback(async () => {
    setLastError(null);
    await kernelClient.init();
  }, []);

  const runPython = useCallback(async (code: string): Promise<RunPythonResult> => {
    setLastError(null);
    const result = await kernelClient.runPython(code);

    if (result.error) {
      setLastError(result.error);
    }

    return result;
  }, []);

  const loadCsv = useCallback(
    async (bytes: Uint8Array, options?: LoadCsvOptions): Promise<LoadCsvResult> => {
      setLastError(null);
      const result = await kernelClient.loadCsv(bytes, options);

      if (result.error) {
        setLastError(result.error);
      }

      return result;
    },
    [],
  );

  const restart = useCallback(async () => {
    setLastError(null);
    await kernelClient.restart();
  }, []);

  const value = useMemo(
    () => ({
      status,
      progressStage,
      lastError,
      init,
      runPython,
      loadCsv,
      restart,
    }),
    [status, progressStage, lastError, init, runPython, loadCsv, restart],
  );

  return <PyodideContext.Provider value={value}>{children}</PyodideContext.Provider>;
}

export function usePyodide(): PyodideContextValue {
  const context = useContext(PyodideContext);

  if (!context) {
    throw new Error('usePyodide must be used within a PyodideProvider');
  }

  return context;
}
