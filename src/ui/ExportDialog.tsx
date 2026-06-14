import { FileCode, Notebook } from 'lucide-react';

import { downloadNotebook } from '@/export/notebook';
import { downloadPythonScript } from '@/export/python-script';
import { useWorkflowStore } from '@/state/workflow-store';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const workflow = useWorkflowStore((s) => s.workflow);

  const handlePythonExport = () => {
    downloadPythonScript(workflow);
    onOpenChange(false);
  };

  const handleNotebookExport = () => {
    downloadNotebook(workflow);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export pipeline</DialogTitle>
          <DialogDescription>
            Download your workflow as runnable Python code.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="justify-start gap-2" onClick={handlePythonExport}>
            <FileCode className="size-4" />
            Python script (.py)
          </Button>
          <Button variant="outline" className="justify-start gap-2" onClick={handleNotebookExport}>
            <Notebook className="size-4" />
            Jupyter notebook (.ipynb)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
