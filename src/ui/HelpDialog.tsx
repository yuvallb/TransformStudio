import { ExternalLink, Keyboard } from 'lucide-react';

import { SITE } from '@/lib/site-config';
import { useUiStore } from '@/state/ui-store';
import { PyodideDiagnostics } from '@/ui/PyodideDiagnostics';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';

const SHORTCUTS = [
  { keys: '⌘/Ctrl + N', action: 'New workflow' },
  { keys: '⌘/Ctrl + S', action: 'Save version' },
  { keys: '⌘/Ctrl + Z', action: 'Undo' },
  { keys: '⌘/Ctrl + Shift + Z', action: 'Redo' },
  { keys: 'Delete / Backspace', action: 'Delete selected node or edge' },
] as const;

export function HelpDialog() {
  const open = useUiStore((s) => s.helpDialogOpen);
  const setOpen = useUiStore((s) => s.setHelpDialogOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4" />
            Help & shortcuts
          </DialogTitle>
          <DialogDescription>Getting started, keyboard shortcuts, and runtime diagnostics.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Getting started</p>
            <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
              {SITE.gettingStarted.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <a
              href={SITE.urls.readme}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Full documentation on GitHub
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Keyboard shortcuts</p>
            <table className="w-full text-sm">
              <tbody>
                {SHORTCUTS.map((row) => (
                  <tr key={row.keys} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs text-foreground">{row.keys}</td>
                    <td className="py-2 text-muted-foreground">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Diagnostics</p>
            <PyodideDiagnostics />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HelpButton() {
  const setOpen = useUiStore((s) => s.setHelpDialogOpen);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label="Help and keyboard shortcuts"
      >
        Help
      </Button>
      <HelpDialog />
    </>
  );
}
