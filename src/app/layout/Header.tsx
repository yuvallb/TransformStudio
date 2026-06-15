import { History, Play, Share2, Download, FilePlus, GitCompare } from 'lucide-react';

import { useExecution } from '@/hooks/useExecution';
import { Button } from '@/ui/components/ui/button';
import { ExportDialog } from '@/ui/ExportDialog';
import { ParamDialog } from '@/ui/ParamDialog';
import { ShareDialog } from '@/ui/ShareDialog';
import { VersionHistory } from '@/ui/VersionHistory';
import { useRuntimeStore } from '@/state/runtime-store';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

export function Header() {
  const workflow = useWorkflowStore((s) => s.workflow);
  const paramCount = workflow.params.length;
  const { runPipeline } = useExecution();
  const isRunning = useRuntimeStore((s) => s.isRunning);

  const saveStatus = useUiStore((s) => s.saveStatus);
  const compareMode = useUiStore((s) => s.compareMode);
  const setCompareMode = useUiStore((s) => s.setCompareMode);
  const paramDialogOpen = useUiStore((s) => s.paramDialogOpen);
  const setParamDialogOpen = useUiStore((s) => s.setParamDialogOpen);
  const exportDialogOpen = useUiStore((s) => s.exportDialogOpen);
  const setExportDialogOpen = useUiStore((s) => s.setExportDialogOpen);
  const shareDialogOpen = useUiStore((s) => s.shareDialogOpen);
  const setShareDialogOpen = useUiStore((s) => s.setShareDialogOpen);
  const versionDialogOpen = useUiStore((s) => s.versionDialogOpen);
  const setVersionDialogOpen = useUiStore((s) => s.setVersionDialogOpen);
  const versionOpenSaveOnMount = useUiStore((s) => s.versionOpenSaveOnMount);
  const setVersionOpenSaveOnMount = useUiStore((s) => s.setVersionOpenSaveOnMount);

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
              setVersionOpenSaveOnMount(false);
              setVersionDialogOpen(true);
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
              setVersionOpenSaveOnMount(true);
              setVersionDialogOpen(true);
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
            disabled={isRunning}
            aria-label="Share workflow"
          >
            <Share2 className="size-4" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={isRunning}
            aria-label="Export code"
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </header>

      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} />

      <ParamDialog
        open={paramDialogOpen}
        onOpenChange={setParamDialogOpen}
        onRun={(overrides) => {
          useWorkflowStore.getState().setParamOverrides(overrides);
          void runPipeline();
        }}
      />

      <VersionHistory
        open={versionDialogOpen}
        onOpenChange={(open) => {
          setVersionDialogOpen(open);
          if (!open) setVersionOpenSaveOnMount(false);
        }}
        openSaveOnMount={versionOpenSaveOnMount}
      />
    </>
  );
}
