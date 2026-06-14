import { useMemo } from 'react';
import DataEditor, { GridCellKind, type GridCell, type GridColumn } from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';

import { PREVIEW_ROW_CAP } from '@/lib/constants';
import type { PreviewPayload } from '@/lib/types';
import { useRuntimeStore } from '@/state/runtime-store';
import { useWorkflowStore } from '@/state/workflow-store';

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function PreviewGrid() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const preview = useRuntimeStore((s) =>
    selectedNodeId ? (s.byNodeId.get(selectedNodeId)?.preview ?? null) : null,
  );

  const { columns, getCellContent, rowCount } = useMemo(() => {
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
      };
    }

    const gridColumns: GridColumn[] = preview.columns.map((col) => ({
      title: col.name,
      id: col.name,
      width: 140,
    }));

    const getCellContent = (cell: readonly [number, number]): GridCell => {
      const [col, row] = cell;
      const columnName = preview.columns[col]?.name;
      const value = columnName ? preview.rows[row]?.[columnName] : '';
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
      rowCount: preview.rows.length,
    };
  }, [preview]);

  if (!selectedNodeId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a node to preview its output
      </div>
    );
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
      </div>
      <div className="min-h-0 flex-1">
        <DataEditor
          columns={columns}
          rows={rowCount}
          getCellContent={getCellContent}
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
