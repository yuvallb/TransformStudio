import { useCallback } from 'react';

import { FlowCanvas } from '@/canvas/FlowCanvas';
import { useFileImport } from '@/hooks/useFileImport';
import { DemoPicker } from '@/ui/DemoPicker';

export function FileDropzone() {
  const { ingestFile } = useFileImport();

  const handleDropFile = useCallback(
    (file: File, position: { x: number; y: number }) => {
      void ingestFile(file, position);
    },
    [ingestFile],
  );

  return (
    <div className="relative h-full w-full">
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
