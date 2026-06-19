import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

import { detectDelimiter } from '@/lib/delimiter';
import { LARGE_FILE_WARN_BYTES } from '@/lib/constants';
import type { NodeType } from '@/lib/types';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.csv') || file.type === 'text/csv';
}

function isJsonFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.json') || file.type === 'application/json';
}

interface ImportContext {
  nodeId?: string;
  position: { x: number; y: number };
}

interface FileImportContextValue {
  ingestFile: (
    file: File,
    position: { x: number; y: number },
    nodeId?: string,
  ) => Promise<void>;
  requestImport: (
    nodeType: 'source.csv' | 'source.json',
    opts?: { nodeId?: string; position?: { x: number; y: number } },
  ) => void;
}

const FileImportContext = createContext<FileImportContextValue | null>(null);

export function FileImportProvider({ children }: { children: ReactNode }) {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const importContextRef = useRef<ImportContext>({ position: { x: 120, y: 120 } });

  const addNode = useWorkflowStore((s) => s.addNode);
  const setDataset = useWorkflowStore((s) => s.setDataset);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const markAllStale = useWorkflowStore((s) => s.markAllStale);
  const setRightPanelTab = useUiStore((s) => s.setRightPanelTab);
  const setSharedImport = useUiStore((s) => s.setSharedImport);

  const ingestFile = useCallback(
    async (file: File, position: { x: number; y: number }, targetNodeId?: string) => {
      if (!useWorkflowStore.getState().isHydrated) return;

      const isCsv = isCsvFile(file);
      const isJson = isJsonFile(file);
      if (!isCsv && !isJson) {
        toast.error('Unsupported file type. Choose a CSV or JSON file.');
        return;
      }

      if (file.size > LARGE_FILE_WARN_BYTES) {
        toast.warning('Large file — processing may be slow');
      }

      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const nodeType: NodeType = isJson ? 'source.json' : 'source.csv';

      const state = useWorkflowStore.getState();
      let sourceId = targetNodeId;

      if (sourceId) {
        const existing = state.workflow.nodes.find((n) => n.id === sourceId);
        if (!existing) {
          sourceId = undefined;
        } else if (existing.type !== nodeType) {
          toast.error(
            `Expected a ${nodeType === 'source.json' ? 'JSON' : 'CSV'} file for this node.`,
          );
          return;
        }
      }

      if (!sourceId) {
        sourceId = state.workflow.nodes.find((n) => n.type === nodeType)?.id;
      }

      if (!sourceId) {
        sourceId = addNode(nodeType, position);
      }

      setDataset(sourceId, {
        nodeId: sourceId,
        filename: file.name,
        data,
      });

      setSharedImport(false);

      if (isCsv) {
        const text = new TextDecoder().decode(data.slice(0, 4096));
        const delimiter = detectDelimiter(text);
        updateNodeConfig(sourceId, { delimiter });
      }

      selectNode(sourceId);
      setRightPanelTab('profile');
      markAllStale();
    },
    [
      addNode,
      setDataset,
      updateNodeConfig,
      selectNode,
      markAllStale,
      setRightPanelTab,
      setSharedImport,
    ],
  );

  const requestImport = useCallback(
    (
      nodeType: 'source.csv' | 'source.json',
      opts?: { nodeId?: string; position?: { x: number; y: number } },
    ) => {
      importContextRef.current = {
        nodeId: opts?.nodeId,
        position: opts?.position ?? { x: 120, y: 120 },
      };
      if (nodeType === 'source.json') {
        jsonInputRef.current?.click();
      } else {
        csvInputRef.current?.click();
      }
    },
    [],
  );

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const { nodeId, position } = importContextRef.current;
        void ingestFile(file, position, nodeId);
      }
      event.target.value = '';
    },
    [ingestFile],
  );

  const contextValue = useMemo(
    () => ({ ingestFile, requestImport }),
    [ingestFile, requestImport],
  );

  return (
    <FileImportContext.Provider value={contextValue}>
      {children}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-label="Upload CSV file"
        onChange={handleFileInput}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label="Upload JSON file"
        onChange={handleFileInput}
      />
    </FileImportContext.Provider>
  );
}

export function useFileImport(): FileImportContextValue {
  const ctx = useContext(FileImportContext);
  if (!ctx) {
    throw new Error('useFileImport must be used within FileImportProvider');
  }
  return ctx;
}
