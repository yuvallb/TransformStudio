import { useCallback, useEffect, useState } from 'react';
import { GitBranch, GitCompare, History, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import {
  buildDatasetsMapForWorkflow,
  copyDatasetsToWorkflow,
  deleteOrphanedDatasets,
  loadDatasetsForWorkflow,
} from '@/data/dataset-repo';
import { saveWorkflow } from '@/data/workflow-repo';
import { getVersion, listVersions } from '@/data/version-repo';
import { forkFromSnapshot, revertToSnapshot, createSnapshot } from '@/versioning/snapshot';
import { diffWorkflows } from '@/versioning/diff';
import type { VersionSnapshot } from '@/lib/types';
import { useRuntimeStore } from '@/state/runtime-store';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Input } from '@/ui/components/ui/input';

interface VersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openSaveOnMount?: boolean;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function VersionHistory({ open, onOpenChange, openSaveOnMount }: VersionHistoryProps) {
  const workflowId = useWorkflowStore((s) => s.workflow.id);
  const workflow = useWorkflowStore((s) => s.workflow);
  const loadWorkflowState = useWorkflowStore((s) => s.loadWorkflowState);
  const newWorkflow = useWorkflowStore((s) => s.newWorkflow);
  const setHydrated = useWorkflowStore((s) => s.setHydrated);
  const markAllStale = useWorkflowStore((s) => s.markAllStale);
  const setCompareMode = useUiStore((s) => s.setCompareMode);
  const clearRuntime = useRuntimeStore((s) => s.reset);

  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [versionMessage, setVersionMessage] = useState('');
  const [compareBaseId, setCompareBaseId] = useState<string | null>(null);

  const refreshVersions = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listVersions(workflowId);
      setVersions(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to load versions: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (open) {
      void refreshVersions();
      if (openSaveOnMount) {
        setSaveDialogOpen(true);
      }
    }
  }, [open, openSaveOnMount, refreshVersions]);

  const handleSaveVersion = async () => {
    const message = versionMessage.trim() || `Version ${new Date().toLocaleString()}`;
    try {
      await createSnapshot(workflow, message);
      setVersionMessage('');
      setSaveDialogOpen(false);
      toast.success('Version saved');
      await refreshVersions();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save version: ${message}`);
    }
  };

  const loadDatasetsIntoStore = async (targetWorkflow: typeof workflow) => {
    const records = await loadDatasetsForWorkflow(targetWorkflow.id);
    return buildDatasetsMapForWorkflow(targetWorkflow, records);
  };

  const handleRevert = async (snapshotId: string) => {
    try {
      const restored = await revertToSnapshot(snapshotId, workflow);
      await deleteOrphanedDatasets(restored.id, restored);
      const datasets = await loadDatasetsIntoStore(restored);
      setCompareMode(null);
      clearRuntime();
      loadWorkflowState(restored, datasets);
      markAllStale();
      toast.success('Reverted to selected version');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to revert: ${message}`);
    }
  };

  const handleFork = async (snapshotId: string) => {
    try {
      const forked = await forkFromSnapshot(snapshotId);
      const snapshot = await getVersion(snapshotId);
      if (snapshot) {
        const nodeIdMap = new Map(
          snapshot.workflow.nodes.map((n) => [n.id, n.id] as [string, string]),
        );
        const datasets = await copyDatasetsToWorkflow(snapshot.workflowId, forked.id, nodeIdMap);
        setCompareMode(null);
        clearRuntime();
        setHydrated(false);
        loadWorkflowState(forked, datasets);
        setHydrated(true);
        markAllStale();
        toast.success('Forked workflow created');
        onOpenChange(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to fork: ${message}`);
    }
  };

  const handleCompare = async (snapshotId: string) => {
    try {
      const snapshot = await getVersion(snapshotId);
      if (!snapshot) {
        toast.error('Snapshot not found');
        return;
      }

      const diff = diffWorkflows(snapshot.workflow, workflow);
      setCompareMode({
        baseWorkflow: snapshot.workflow,
        targetWorkflow: workflow,
        diff,
        baseLabel: snapshot.message,
        targetLabel: 'Current',
      });
      toast.info('Compare mode enabled — click Exit compare in the header');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to compare: ${message}`);
    }
  };

  const handleCompareTwoVersions = async (baseId: string, targetId: string) => {
    try {
      const base = await getVersion(baseId);
      const target = targetId === 'current' ? null : await getVersion(targetId);
      if (!base) {
        toast.error('Base version not found');
        return;
      }

      const targetWorkflow = target?.workflow ?? workflow;
      const diff = diffWorkflows(base.workflow, targetWorkflow);
      setCompareMode({
        baseWorkflow: base.workflow,
        targetWorkflow,
        diff,
        baseLabel: base.message,
        targetLabel: target?.message ?? 'Current',
      });
      setCompareBaseId(null);
      onOpenChange(false);
      toast.info('Compare mode enabled');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to compare: ${message}`);
    }
  };

  const handleNewWorkflow = async () => {
    try {
      const fresh = newWorkflow();
      await saveWorkflow(fresh);
      setCompareMode(null);
      clearRuntime();
      setHydrated(true);
      toast.success('New workflow created');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to create workflow: ${message}`);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-4" />
              Version history
            </DialogTitle>
            <DialogDescription>
              Save snapshots, revert changes, fork workflows, or compare versions.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => setSaveDialogOpen(true)}>
              Save version
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleNewWorkflow()}>
              New workflow
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading versions…</p>
            )}
            {!loading && versions.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No saved versions yet. Click &quot;Save version&quot; to create one.
              </p>
            )}
            <ul className="space-y-2">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="rounded-md border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{version.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(version.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        title="Revert"
                        onClick={() => void handleRevert(version.id)}
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        title="Fork"
                        onClick={() => void handleFork(version.id)}
                      >
                        <GitBranch className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        title="Compare with current"
                        onClick={() => void handleCompare(version.id)}
                      >
                        <GitCompare className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        title="Compare with another version"
                        onClick={() =>
                          setCompareBaseId(compareBaseId === version.id ? null : version.id)
                        }
                      >
                        vs
                      </Button>
                    </div>
                  </div>
                  {compareBaseId === version.id && (
                    <div className="mt-2 space-y-1 border-t border-border pt-2">
                      <p className="text-xs text-muted-foreground">Compare {version.message} with:</p>
                      {versions
                        .filter((v) => v.id !== version.id)
                        .map((other) => (
                          <Button
                            key={other.id}
                            size="sm"
                            variant="outline"
                            className="mr-1 h-7 text-xs"
                            onClick={() => void handleCompareTwoVersions(version.id, other.id)}
                          >
                            {other.message}
                          </Button>
                        ))}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => void handleCompareTwoVersions(version.id, 'current')}
                      >
                        Current
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save version</DialogTitle>
            <DialogDescription>Describe what changed in this snapshot.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. Added join node"
            value={versionMessage}
            onChange={(e) => setVersionMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSaveVersion();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveVersion()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
