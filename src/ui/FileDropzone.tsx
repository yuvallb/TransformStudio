import { useCallback, useRef } from 'react';

import { FlowCanvas } from '@/canvas/FlowCanvas';
import { useWorkflowStore } from '@/state/workflow-store';

export function FileDropzone() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addNode = useWorkflowStore((s) => s.addNode);
  const setDataset = useWorkflowStore((s) => s.setDataset);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const markAllStale = useWorkflowStore((s) => s.markAllStale);

  const ingestFile = useCallback(
    async (file: File, position: { x: number; y: number }) => {
      if (!file.name.toLowerCase().endsWith('.csv')) return;

      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);

      const state = useWorkflowStore.getState();
      let sourceId = state.workflow.nodes.find((n) => n.type === 'source.csv')?.id;

      if (!sourceId) {
        sourceId = addNode('source.csv', position);
      }

      setDataset(sourceId, {
        nodeId: sourceId,
        filename: file.name,
        data,
      });

      selectNode(sourceId);
      markAllStale();
    },
    [addNode, setDataset, selectNode, markAllStale],
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
        accept=".csv,text/csv"
        className="sr-only"
        aria-label="Upload CSV file"
        onChange={handleFileInput}
      />
      <FlowCanvas onDropFile={handleDropFile} />
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
        <p className="rounded-md border border-dashed border-border bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          Drop a CSV file here or drag nodes from the palette
        </p>
      </div>
    </div>
  );
}
