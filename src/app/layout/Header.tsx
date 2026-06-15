import { useState } from 'react';
import { History, Play, Share2, Download, FilePlus, GitCompare } from 'lucide-react';

import { useExecution } from '@/hooks/useExecution';
import { Button } from '@/ui/components/ui/button';
import { ExportDialog } from '@/ui/ExportDialog';
import { ParamDialog } from '@/ui/ParamDialog';
import { ShareDialog } from '@/ui/ShareDialog';
import { VersionHistory } from '@/ui/VersionHistory';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

export function Header() {
  const workflow = useWorkflowStore((s) => s.workflow);
  const paramCount = workflow.params.length;
  const { runPipeline } = useExecution();
  const [paramDialogOpen, setParamDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const saveStatus = useUiStore((s) => s.saveStatus);
  const [versionOpen, setVersionOpen] = useState(false);
  const [openSaveOnMount, setOpenSaveOnMount] = useState(false);
  const compareMode = useUiStore((s) => s.compareMode);
  const setCompareMode = useUiStore((s) => s.setCompareMode);

  const saveLabel =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : null;

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            T
          </span>
          <span className="text-sm font-semibold tracking-tight">Transform Studio</span>
          <span className="text-xs text-muted-foreground">— {workflow.name}</span>
          {saveLabel && (
            <span
              className="text-xs text-muted-foreground"
              data-testid="save-status"
              aria-live="polite"
            >
              {saveLabel}
            </span>
          )}
          {compareMode && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              Comparing: {compareMode.baseLabel} → {compareMode.targetLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {compareMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareMode(null)}
              aria-label="Exit compare mode"
            >
              <GitCompare className="size-4" />
              Exit compare
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOpenSaveOnMount(false);
              setVersionOpen(true);
            }}
            aria-label="Version history"
          >
            <History className="size-4" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOpenSaveOnMount(true);
              setVersionOpen(true);
            }}
            aria-label="Save version"
          >
            <FilePlus className="size-4" />
            Save version
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setParamDialogOpen(true)}
            aria-label="Run with parameters"
          >
            <Play className="size-4" />
            Run with parameters
            {paramCount > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                {paramCount}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} aria-label="Share workflow">
            <Share2 className="size-4" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportOpen(true)}
            aria-label="Export code"
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </header>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />

      <ParamDialog
        open={paramDialogOpen}
        onOpenChange={setParamDialogOpen}
        onRun={(overrides) => {
          useWorkflowStore.getState().setParamOverrides(overrides);
          void runPipeline();
        }}
      />

      <VersionHistory
        open={versionOpen}
        onOpenChange={(open) => {
          setVersionOpen(open);
          if (!open) setOpenSaveOnMount(false);
        }}
        openSaveOnMount={openSaveOnMount}
      />
    </>
  );
}
