import {
  ArrowUpDown,
  Columns3,
  Combine,
  Download,
  Eraser,
  FileJson,
  FileSpreadsheet,
  Filter,
  FunctionSquare,
  GitMerge,
  Layers,
  PaintBucket,
  TextCursorInput,
  Type,
} from 'lucide-react';

import { getNodesByCategory } from '@/nodes/registry';
import type { NodeType } from '@/lib/types';
import { useWorkflowStore } from '@/state/workflow-store';

const CATEGORY_LABELS = {
  source: 'Source',
  transform: 'Transform',
  output: 'Output',
} as const;

const NODE_ICONS: Partial<Record<NodeType, React.ComponentType<{ className?: string }>>> = {
  'source.csv': FileSpreadsheet,
  'source.json': FileJson,
  filter: Filter,
  select: Columns3,
  rename: TextCursorInput,
  derive: FunctionSquare,
  sort: ArrowUpDown,
  groupby: Layers,
  join: GitMerge,
  concat: Combine,
  dropna: Eraser,
  fillna: PaintBucket,
  cast: Type,
  output: Download,
};

export function NodePalette() {
  const grouped = getNodesByCategory();
  const addNode = useWorkflowStore((s) => s.addNode);

  const onDragStart = (event: React.DragEvent, type: NodeType) => {
    event.dataTransfer.setData('application/transformstudio-node', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onAddClick = (type: NodeType) => {
    const state = useWorkflowStore.getState();
    const index = state.workflow.nodes.length;
    addNode(type, { x: 80 + index * 220, y: 180 });
  };

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
      {(Object.keys(grouped) as Array<keyof typeof grouped>).map((category) => {
        const nodes = grouped[category];
        if (nodes.length === 0) return null;

        return (
          <div key={category}>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABELS[category]}
            </p>
            <div className="flex flex-col gap-1">
              {nodes.map((node) => {
                const Icon = NODE_ICONS[node.type];
                return (
                  <button
                    key={node.type}
                    type="button"
                    draggable
                    aria-label={`Add ${node.label} node`}
                    onDragStart={(e) => onDragStart(e, node.type)}
                    onClick={() => onAddClick(node.type)}
                    className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left text-xs hover:bg-muted active:cursor-grabbing"
                  >
                    {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
                    {node.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
