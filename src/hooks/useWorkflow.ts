import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import {
  buildDatasetsMapForWorkflow,
  deleteDatasetForNode,
  loadDatasetsForWorkflow,
  saveDataset,
} from '@/data/dataset-repo';
import { saveWorkflow, getMostRecentWorkflow } from '@/data/workflow-repo';
import { createSnapshot } from '@/versioning/snapshot';
import { AUTO_SNAPSHOT_EDIT_COUNT, AUTOSAVE_DEBOUNCE_MS } from '@/lib/constants';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

export function useWorkflow() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoSnapshotEditCount = useRef(0);
  const datasetsRef = useRef(useWorkflowStore.getState().datasets);

  const workflow = useWorkflowStore((s) => s.workflow);
  const datasets = useWorkflowStore((s) => s.datasets);
  const isHydrated = useWorkflowStore((s) => s.isHydrated);
  const editCount = useWorkflowStore((s) => s.editCount);
  const loadWorkflowState = useWorkflowStore((s) => s.loadWorkflowState);
  const setHydrated = useWorkflowStore((s) => s.setHydrated);
  const markAllStale = useWorkflowStore((s) => s.markAllStale);

  const setSaveStatus = useUiStore((s) => s.setSaveStatus);

  datasetsRef.current = datasets;

  const persistWorkflow = useCallback(async () => {
    const state = useWorkflowStore.getState();
    if (!state.isHydrated) return;

    setSaveStatus('saving');
    try {
      await saveWorkflow(state.workflow);
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('idle');
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save workflow: ${message}`);
    }
  }, [setSaveStatus]);

  const persistDataset = useCallback(
    async (nodeId: string) => {
      const state = useWorkflowStore.getState();
      if (!state.isHydrated) return;

      const dataset = state.datasets[nodeId];
      if (!dataset) return;

      const mimeType = state.workflow.nodes.find((n) => n.id === nodeId)?.type.startsWith(
        'source.json',
      )
        ? 'application/json'
        : 'text/csv';

      try {
        await saveDataset(state.workflow.id, nodeId, dataset, mimeType);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to save dataset: ${message}`);
      }
    },
    [],
  );

  const scheduleAutosave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persistWorkflow();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [persistWorkflow]);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const stored = await getMostRecentWorkflow();
        if (cancelled) return;

        if (stored) {
          const records = await loadDatasetsForWorkflow(stored.id);
          loadWorkflowState(stored, buildDatasetsMapForWorkflow(stored, records));
        } else {
          const current = useWorkflowStore.getState().workflow;
          await saveWorkflow(current);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to restore workflow: ${message}`);
      } finally {
        if (!cancelled) {
          setHydrated(true);
          markAllStale();
        }
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, [loadWorkflowState, setHydrated, markAllStale]);

  useEffect(() => {
    if (!isHydrated) return;
    scheduleAutosave();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [workflow, isHydrated, scheduleAutosave]);

  useEffect(() => {
    if (!isHydrated) return;

    for (const nodeId of Object.keys(datasets)) {
      void persistDataset(nodeId);
    }
  }, [datasets, isHydrated, persistDataset]);

  useEffect(() => {
    if (!isHydrated) return;
    if (editCount - lastAutoSnapshotEditCount.current < AUTO_SNAPSHOT_EDIT_COUNT) return;

    lastAutoSnapshotEditCount.current = editCount;
    const state = useWorkflowStore.getState();
    void createSnapshot(state.workflow, 'Auto-save');
  }, [editCount, isHydrated]);

  const handleNodeDeleted = useCallback(async (nodeId: string) => {
    const state = useWorkflowStore.getState();
    try {
      await deleteDatasetForNode(state.workflow.id, nodeId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to delete dataset: ${message}`);
    }
  }, []);

  useEffect(() => {
    return useWorkflowStore.subscribe((state, prev) => {
      const newDeleted = state.deletedNodeIds.filter((id) => !prev.deletedNodeIds.includes(id));
      for (const nodeId of newDeleted) {
        void handleNodeDeleted(nodeId);
      }
    });
  }, [handleNodeDeleted]);

  return { persistWorkflow };
}

export async function restoreWorkflowFromStorage(): Promise<void> {
  const state = useWorkflowStore.getState();

  if (state.isHydrated) {
    const records = await loadDatasetsForWorkflow(state.workflow.id);
    useWorkflowStore.setState({
      datasets: buildDatasetsMapForWorkflow(state.workflow, records),
    });
    state.markAllStale();
    return;
  }

  const stored = await getMostRecentWorkflow();
  if (!stored) return;

  const records = await loadDatasetsForWorkflow(stored.id);
  state.loadWorkflowState(stored, buildDatasetsMapForWorkflow(stored, records));
  state.markAllStale();
}
