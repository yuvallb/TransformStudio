import { getNodesByCategory } from '@/nodes/registry';
import type { NodeType } from '@/lib/types';
import { useWorkflowStore } from '@/state/workflow-store';

const CATEGORY_LABELS = {
  source: 'Source',
  transform: 'Transform',
  output: 'Output',
} as const;

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
              {nodes.map((node) => (
                <button
                  key={node.type}
                  type="button"
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                  onClick={() => onAddClick(node.type)}
                  className="cursor-grab rounded-md border border-border bg-background px-2.5 py-1.5 text-left text-xs hover:bg-muted active:cursor-grabbing"
                >
                  {node.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
