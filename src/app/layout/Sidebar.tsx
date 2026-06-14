import { NodePalette } from '@/canvas/NodePalette';

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Node Library
        </p>
      </div>
      <NodePalette />
    </aside>
  );
}
