import { Share2, Download } from 'lucide-react';

import { downloadPythonScript } from '@/export/python-script';
import { Button } from '@/ui/components/ui/button';
import { useWorkflowStore } from '@/state/workflow-store';

export function Header() {
  const workflow = useWorkflowStore((s) => s.workflow);

  const handleExport = () => {
    downloadPythonScript(workflow);
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          T
        </span>
        <span className="text-sm font-semibold tracking-tight">Transform Studio</span>
        <span className="text-xs text-muted-foreground">— {workflow.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled aria-label="Share workflow">
          <Share2 className="size-4" />
          Share
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} aria-label="Export code">
          <Download className="size-4" />
          Export
        </Button>
      </div>
    </header>
  );
}
