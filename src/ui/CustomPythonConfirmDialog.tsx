import { acknowledgeCustomPython } from '@/lib/custom-python-gate';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/components/ui/alert-dialog';

export function CustomPythonConfirmDialog() {
  const open = useUiStore((s) => s.customPythonConfirmOpen);
  const pendingPosition = useUiStore((s) => s.customPythonPendingPosition);
  const closeCustomPythonConfirm = useUiStore((s) => s.closeCustomPythonConfirm);

  const handleConfirm = () => {
    acknowledgeCustomPython();
    if (pendingPosition) {
      useWorkflowStore.getState().addNode('custom.python', pendingPosition);
    }
    closeCustomPythonConfirm();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeCustomPythonConfirm();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Use Custom Python?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Custom Python runs your code in the browser worker. Allowed transforms use Pandas
                on the input DataFrame (<code className="text-foreground">inp</code>); assign the
                result to <code className="text-foreground">out</code>.
              </p>
              <p>
                Imports, file access, and other unsafe patterns are blocked. Review exported code
                before running it outside RefineIt.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>I understand — add node</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
