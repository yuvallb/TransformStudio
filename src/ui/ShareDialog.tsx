import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Copy, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { saveWorkflow } from '@/data/workflow-repo';
import {
  copyShareUrl,
  encodeWorkflowToHash,
  formatShareSize,
  getShareSizeLevel,
  writeWorkflowHash,
  clearWorkflowHash,
  type ShareSizeLevel,
} from '@/sharing/url';
import { deserializeWorkflow, downloadWorkflowFile } from '@/sharing/serialize';
import { useRuntimeStore } from '@/state/runtime-store';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function sizeWarningMessage(level: ShareSizeLevel): string | null {
  if (level === 'warning') {
    return 'This link is fairly large and may not work in all browsers.';
  }
  if (level === 'tooLarge') {
    return 'This workflow is too large for URL sharing. Download a .tstudio.json file instead.';
  }
  return null;
}

export function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
  const workflow = useWorkflowStore((s) => s.workflow);
  const loadWorkflowState = useWorkflowStore((s) => s.loadWorkflowState);
  const markAllStale = useWorkflowStore((s) => s.markAllStale);
  const setSharedImport = useUiStore((s) => s.setSharedImport);

  const [shareUrl, setShareUrl] = useState('');
  const [sizeBytes, setSizeBytes] = useState(0);
  const [sizeLevel, setSizeLevel] = useState<ShareSizeLevel>('safe');
  const [encoding, setEncoding] = useState(false);
  const [copying, setCopying] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setEncoding(true);
    setShareUrl('');

    void encodeWorkflowToHash(workflow)
      .then(({ hash, sizeBytes: bytes }) => {
        if (cancelled) return;
        const base = `${window.location.origin}${window.location.pathname}`;
        setShareUrl(`${base}#${hash}`);
        setSizeBytes(bytes);
        setSizeLevel(getShareSizeLevel(bytes));
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to prepare share link: ${message}`);
      })
      .finally(() => {
        if (!cancelled) setEncoding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, workflow]);

  const handleCopyLink = useCallback(async () => {
    if (sizeLevel === 'tooLarge') return;

    setCopying(true);
    try {
      const { hash } = await encodeWorkflowToHash(workflow);
      writeWorkflowHash(hash);
      await copyShareUrl();
      toast.success('Link copied to clipboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to copy link: ${message}`);
    } finally {
      setCopying(false);
    }
  }, [workflow, sizeLevel]);

  const handleDownloadFile = useCallback(() => {
    downloadWorkflowFile(workflow);
    toast.success('Workflow downloaded');
  }, [workflow]);

  const handleImportFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const imported = deserializeWorkflow(text);
        useRuntimeStore.getState().reset();
        loadWorkflowState(imported, {});
        setSharedImport(true);
        markAllStale();
        clearWorkflowHash();
        await saveWorkflow(imported);
        toast.success('Workflow imported');
        onOpenChange(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to import workflow: ${message}`);
      }
    },
    [loadWorkflowState, markAllStale, onOpenChange, setSharedImport],
  );

  const warning = sizeWarningMessage(sizeLevel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share workflow</DialogTitle>
          <DialogDescription>
            Share your pipeline configuration via link or file. Dataset files are never included.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {encoding ? (
            <p className="text-sm text-muted-foreground">Preparing share link…</p>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Encoded size: {formatShareSize(sizeBytes)}
                </p>
                {warning && (
                  <div
                    className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
                      sizeLevel === 'tooLarge'
                        ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                        : 'border-border bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>{warning}</span>
                  </div>
                )}
              </div>

              {sizeLevel !== 'tooLarge' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Share URL</label>
                  <p className="break-all rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs">
                    {shareUrl || '—'}
                  </p>
                  <Button
                    className="w-full gap-2"
                    onClick={() => void handleCopyLink()}
                    disabled={!shareUrl || copying}
                  >
                    <Copy className="size-4" />
                    {copying ? 'Copying…' : 'Copy shareable link'}
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground">File fallback</p>
                <Button variant="outline" className="justify-start gap-2" onClick={handleDownloadFile}>
                  <Download className="size-4" />
                  Download .tstudio.json
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => importInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                  Import .tstudio.json
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,.tstudio.json,application/json"
                  className="sr-only"
                  aria-label="Import workflow file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImportFile(file);
                    event.target.value = '';
                  }}
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
