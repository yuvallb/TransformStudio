import { useMemo } from 'react';
import DataEditor, {
  GridCellKind,
  type GridCell,
  type GridColumn,
  type Highlight,
} from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';

import { PREVIEW_ROW_CAP } from '@/lib/constants';
import type { PreviewPayload } from '@/lib/types';
import { useRuntimeStore } from '@/state/runtime-store';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function PreviewGrid() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const highlightedColumn = useUiStore((s) => s.highlightedColumn);
  const isRunning = useRuntimeStore((s) => s.isRunning);
  const preview = useRuntimeStore((s) =>
    selectedNodeId ? (s.byNodeId.get(selectedNodeId)?.preview ?? null) : null,
  );

  const { columns, getCellContent, rowCount, highlightRegions } = useMemo(() => {
    if (!preview) {
      const emptyCell = (): GridCell => ({
        kind: GridCellKind.Text,
        data: '',
        displayData: '',
        allowOverlay: false,
      });
      return {
        columns: [] as GridColumn[],
        getCellContent: emptyCell,
        rowCount: 0,
        highlightRegions: [] as Highlight[],
      };
    }

    const rows = preview.rows.slice(0, PREVIEW_ROW_CAP);

    const gridColumns: GridColumn[] = preview.columns.map((col) => ({
      title: col.name,
      id: col.name,
      width: 140,
    }));

    const highlightedIndex = highlightedColumn
      ? preview.columns.findIndex((col) => col.name === highlightedColumn)
      : -1;

    const highlights: Highlight[] =
      highlightedIndex >= 0
        ? [
            {
              color: '#10B98133',
              range: {
                x: highlightedIndex,
                y: 0,
                width: 1,
                height: rows.length,
              },
              style: 'solid',
            },
            {
              color: '#10B98155',
              range: {
                x: highlightedIndex,
                y: 0,
                width: 1,
                height: 1,
              },
              style: 'solid',
            },
          ]
        : [];

    const getCellContent = (cell: readonly [number, number]): GridCell => {
      const [col, row] = cell;
      const columnName = preview.columns[col]?.name;
      const value = columnName ? rows[row]?.[columnName] : '';
      const text = formatCell(value);

      return {
        kind: GridCellKind.Text,
        data: text,
        displayData: text,
        allowOverlay: false,
      };
    };

    return {
      columns: gridColumns,
      getCellContent,
      rowCount: rows.length,
      highlightRegions: highlights,
    };
  }, [preview, highlightedColumn]);

  if (!selectedNodeId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a node to preview its output
      </div>
    );
  }

  if (isRunning && !preview) {
    return <PreviewGridSkeleton />;
  }

  if (!preview || preview.rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No preview available — run the pipeline or import data
      </div>
    );
  }

  const showing = Math.min(preview.rows.length, PREVIEW_ROW_CAP);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        Showing {showing.toLocaleString()} of {preview.totalRows.toLocaleString()} rows
        {preview.totalRows > PREVIEW_ROW_CAP && ' (preview capped at 100 rows)'}
        {highlightedColumn && (
          <span className="ml-2 text-primary">· Highlighting {highlightedColumn}</span>
        )}
      </div>
      <div className="min-h-0 flex-1" aria-label="Data preview grid">
        <DataEditor
          columns={columns}
          rows={rowCount}
          getCellContent={getCellContent}
          highlightRegions={highlightRegions}
          width="100%"
          height="100%"
          smoothScrollX
          smoothScrollY
          rowMarkers="number"
          getCellsForSelection={true}
          keybindings={{ search: false }}
        />
      </div>
    </div>
  );
}

export function useSelectedPreview(): PreviewPayload | null {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  return useRuntimeStore((s) =>
    selectedNodeId ? (s.byNodeId.get(selectedNodeId)?.preview ?? null) : null,
  );
}

function PreviewGridSkeleton() {
  return (
    <div className="flex h-full flex-col p-4" aria-busy="true" aria-label="Loading preview">
      <div className="mb-3 h-3 w-32 animate-pulse rounded bg-muted" />
      <div className="flex flex-1 flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="h-6 animate-pulse rounded bg-muted"
            style={{ width: `${60 + (i % 3) * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}
