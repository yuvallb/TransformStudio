import { NodePalette } from '@/canvas/NodePalette';
import { ParamsPanel } from '@/ui/ParamsPanel';

export function Sidebar() {
  return (
    <aside className="flex min-h-0 w-56 shrink-0 flex-col overflow-hidden border-r border-border bg-card">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Node Library
          </p>
        </div>
        <NodePalette />
      </div>
      <div className="flex max-h-[45%] min-h-40 flex-col border-t border-border">
        <ParamsPanel />
      </div>
    </aside>
  );
}
