import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { FlowCanvas } from '@/canvas/FlowCanvas';
import { detectDelimiter } from '@/lib/delimiter';
import { LARGE_FILE_WARN_BYTES } from '@/lib/constants';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';
import { DemoPicker } from '@/ui/DemoPicker';

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.csv') || file.type === 'text/csv';
}

function isJsonFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.json') || file.type === 'application/json';
}

export function FileDropzone() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addNode = useWorkflowStore((s) => s.addNode);
  const setDataset = useWorkflowStore((s) => s.setDataset);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const markAllStale = useWorkflowStore((s) => s.markAllStale);
  const setRightPanelTab = useUiStore((s) => s.setRightPanelTab);
  const setSharedImport = useUiStore((s) => s.setSharedImport);

  const ingestFile = useCallback(
    async (file: File, position: { x: number; y: number }) => {
      if (!useWorkflowStore.getState().isHydrated) return;

      const isCsv = isCsvFile(file);
      const isJson = isJsonFile(file);
      if (!isCsv && !isJson) return;

      if (file.size > LARGE_FILE_WARN_BYTES) {
        toast.warning('Large file — processing may be slow');
      }

      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const nodeType = isJson ? 'source.json' : 'source.csv';

      const state = useWorkflowStore.getState();
      let sourceId = state.workflow.nodes.find((n) => n.type === nodeType)?.id;

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
    [addNode, setDataset, updateNodeConfig, selectNode, markAllStale, setRightPanelTab, setSharedImport],
  );

  const handleDropFile = useCallback(
    (file: File, position: { x: number; y: number }) => {
      void ingestFile(file, position);
    },
    [ingestFile],
  );

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void ingestFile(file, { x: 120, y: 120 });
      }
      event.target.value = '';
    },
    [ingestFile],
  );

  return (
    <div className="relative h-full w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,.json,application/json"
        className="sr-only"
        aria-label="Upload data file"
        onChange={handleFileInput}
      />
      <FlowCanvas onDropFile={handleDropFile} />
      <DemoPicker />
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
        <p className="rounded-md border border-dashed border-border bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          Drop a CSV or JSON file here or drag nodes from the palette
        </p>
      </div>
    </div>
  );
}
