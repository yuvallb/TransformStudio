import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, FileText, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import {
  buildDatasetsMapForWorkflow,
  loadDatasetsForWorkflow,
} from '@/data/dataset-repo';
import { listVersions } from '@/data/version-repo';
import { listWorkflows, saveWorkflow } from '@/data/workflow-repo';
import { DEMOS, type Demo } from '@/lib/demos';
import { relativeTime } from '@/lib/relativeTime';
import type { WorkflowRecord } from '@/lib/types';
import { deserializeWorkflow } from '@/sharing/serialize';
import { useRuntimeStore } from '@/state/runtime-store';
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
import { Button } from '@/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown-menu';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function WorkflowSwitcher() {
  const workflowId = useWorkflowStore((s) => s.workflow.id);
  const editCount = useWorkflowStore((s) => s.editCount);
  const loadWorkflowState = useWorkflowStore((s) => s.loadWorkflowState);
  const newWorkflow = useWorkflowStore((s) => s.newWorkflow);
  const markAllStale = useWorkflowStore((s) => s.markAllStale);
  const setHydrated = useWorkflowStore((s) => s.setHydrated);
  const setCompareMode = useUiStore((s) => s.setCompareMode);
  const setSharedImport = useUiStore((s) => s.setSharedImport);
  const clearRuntime = useRuntimeStore((s) => s.reset);

  const [open, setOpen] = useState(false);
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowRecord[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [guardOpen, setGuardOpen] = useState(false);

  const shouldGuard = useCallback(async () => {
    if (editCount <= 0) return false;
    const versions = await listVersions(workflowId);
    return versions.length === 0;
  }, [editCount, workflowId]);

  const handleNew = useCallback(async () => {
    const fresh = newWorkflow();
    await saveWorkflow(fresh);
    setCompareMode(null);
    setSharedImport(false);
    clearRuntime();
    setHydrated(true);
    toast.success('New workflow created');
    setOpen(false);
  }, [newWorkflow, setCompareMode, setSharedImport, clearRuntime, setHydrated]);

  const handleLoadDemo = useCallback(
    async (demo: Demo) => {
      setLoadingId(demo.id);
      try {
        const response = await fetch(demo.file);
        if (!response.ok) {
          throw new Error(`Failed to load demo (${response.status})`);
        }
        const text = await response.text();
        const workflow = deserializeWorkflow(text);
        clearRuntime();
        loadWorkflowState(workflow, {});
        markAllStale();
        setSharedImport(false);
        setCompareMode(null);
        await saveWorkflow(workflow);
        toast.success(`Loaded demo: ${demo.label}`);
        setOpen(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to load demo: ${message}`);
      } finally {
        setLoadingId(null);
      }
    },
    [clearRuntime, loadWorkflowState, markAllStale, setSharedImport, setCompareMode],
  );

  const handleLoadRecent = useCallback(
    async (record: WorkflowRecord) => {
      if (record.id === workflowId) return;

      setLoadingId(record.id);
      try {
        const datasetRecords = await loadDatasetsForWorkflow(record.id);
        clearRuntime();
        loadWorkflowState(record, buildDatasetsMapForWorkflow(record, datasetRecords));
        markAllStale();
        setSharedImport(false);
        setCompareMode(null);
        toast.success(`Opened: ${record.name}`);
        setOpen(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to open workflow: ${message}`);
      } finally {
        setLoadingId(null);
      }
    },
    [
      workflowId,
      clearRuntime,
      loadWorkflowState,
      markAllStale,
      setSharedImport,
      setCompareMode,
    ],
  );

  const guardedOpen = useCallback(
    async (action: () => Promise<void>) => {
      if (await shouldGuard()) {
        setPendingAction(() => action);
        setGuardOpen(true);
      } else {
        await action();
      }
    },
    [shouldGuard],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (next) {
      setLoadingRecent(true);
      void listWorkflows()
        .then((records) => setRecentWorkflows(records.slice(0, 10)))
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          toast.error(`Failed to load workflows: ${message}`);
        })
        .finally(() => setLoadingRecent(false));
    }
  }, []);

  const handleGuardConfirm = useCallback(async () => {
    const action = pendingAction;
    setGuardOpen(false);
    setPendingAction(null);
    if (action) await action();
  }, [pendingAction]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const mod = event.metaKey || event.ctrlKey;
      if (!mod || (event.key !== 'n' && event.key !== 'N')) return;

      event.preventDefault();
      void guardedOpen(handleNew);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [guardedOpen, handleNew]);

  const isLoading = loadingId !== null;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            data-testid="workflow-switcher-trigger"
            aria-label="Open workflow"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Open
                <ChevronDown className="size-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuItem
              data-testid="new-workflow-item"
              onClick={() => void guardedOpen(handleNew)}
            >
              New workflow
              <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>DEMOS</DropdownMenuLabel>
          <DropdownMenuGroup>
            {DEMOS.map((demo) => (
              <DropdownMenuItem
                key={demo.id}
                data-testid={`demo-item-${demo.id}`}
                className="flex-col items-start gap-0.5 py-2"
                disabled={isLoading}
                onClick={() => void guardedOpen(() => handleLoadDemo(demo))}
              >
                <span className="flex w-full items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <span className="text-sm font-medium">{demo.label}</span>
                </span>
                <span className="pl-6 text-xs text-muted-foreground">{demo.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>RECENT</DropdownMenuLabel>
          <DropdownMenuGroup>
            {loadingRecent && (
              <DropdownMenuItem disabled>
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </DropdownMenuItem>
            )}
            {!loadingRecent && recentWorkflows.length === 0 && (
              <DropdownMenuItem disabled>No saved workflows</DropdownMenuItem>
            )}
            {!loadingRecent &&
              recentWorkflows.map((record) => {
                const isCurrent = record.id === workflowId;
                return (
                  <DropdownMenuItem
                    key={record.id}
                    data-testid={`recent-item-${record.id}`}
                    className={isCurrent ? 'font-semibold' : undefined}
                    disabled={isLoading || isCurrent}
                    onClick={() => void guardedOpen(() => handleLoadRecent(record))}
                  >
                    {isCurrent ? (
                      <Check className="size-4 text-primary" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{record.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(record.updatedAt)}
                    </span>
                  </DropdownMenuItem>
                );
              })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={guardOpen} onOpenChange={setGuardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              This workflow has no saved version. Open anyway? Any unsaved changes will remain in
              history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="guard-confirm" onClick={() => void handleGuardConfirm()}>
              Open anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
