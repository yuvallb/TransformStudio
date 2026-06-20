import { useCallback, useEffect, useRef } from 'react';

import { CycleError } from '@/engine/topo-sort';
import { buildPipelineRequest, updateRuntimeFingerprints } from '@/engine/pipeline';
import { kernelClient } from '@/engine/kernel-client';
import { EXECUTION_DEBOUNCE_MS } from '@/lib/constants';
import { useRuntimeStore } from '@/state/runtime-store';
import { useWorkflowStore } from '@/state/workflow-store';

const runPipelineRef: { current: (() => Promise<void>) | null } = { current: null };

/** Manual pipeline trigger (e.g. Run with parameters). Requires `useExecution()` mounted once. */
export async function runPipelineNow(): Promise<void> {
  await runPipelineRef.current?.();
}

export function useExecution() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);

  const staleNodeIds = useWorkflowStore((s) => s.staleNodeIds);
  const deletedNodeIds = useWorkflowStore((s) => s.deletedNodeIds);
  const isHydrated = useWorkflowStore((s) => s.isHydrated);

  const runPipeline = useCallback(async () => {
    if (runningRef.current) return;

    const workflowState = useWorkflowStore.getState();
    const pendingDeletes = workflowState.deletedNodeIds;
    if (workflowState.workflow.nodes.length === 0 && pendingDeletes.length === 0) return;

    runningRef.current = true;
    const runtimeActions = useRuntimeStore.getState();
    runtimeActions.setIsRunning(true);
    runtimeActions.setGraphError(null);

    const { workflow, staleNodeIds, datasets, paramOverrides } = workflowState;

    try {
      const deleteNodeIds = workflowState.consumeDeletedNodeIds();
      for (const nodeId of deleteNodeIds) {
        runtimeActions.clearNode(nodeId);
      }

      const byNodeId = useRuntimeStore.getState().byNodeId;
      const request = await buildPipelineRequest({
        workflow,
        staleNodeIds,
        runtimeByNode: byNodeId,
        datasets,
        paramOverrides,
      });

      const resolvedNodeIds = new Set<string>();

      if (request.validationFailures.length > 0) {
        const updatedRuntime = new Map(useRuntimeStore.getState().byNodeId);
        for (const failure of request.validationFailures) {
          resolvedNodeIds.add(failure.nodeId);
          const existing = updatedRuntime.get(failure.nodeId);
          updatedRuntime.set(failure.nodeId, {
            nodeId: failure.nodeId,
            status: 'error',
            fingerprint: existing?.fingerprint ?? null,
            preview: existing?.preview ?? null,
            profile: existing?.profile ?? null,
            error: failure.message,
            traceback: null,
          });
        }
        runtimeActions.setNodeStates(Object.fromEntries(updatedRuntime.entries()));
      }

      if (request.nodes.length === 0 && deleteNodeIds.length === 0) {
        if (resolvedNodeIds.size > 0) {
          workflowState.clearStaleForNodes([...resolvedNodeIds]);
        }
        return;
      }

      if (request.nodes.length > 0) {
        const cleared = new Map(useRuntimeStore.getState().byNodeId);
        for (const node of request.nodes) {
          runtimeActions.setRunning(node.nodeId, true);
          const existing = cleared.get(node.nodeId);
          if (existing) {
            cleared.set(node.nodeId, { ...existing, profile: null });
          }
        }
        runtimeActions.setNodeStates(Object.fromEntries(cleared.entries()));
      }

      const result = await kernelClient.executePipeline({
        nodes: request.nodes,
        params: request.params,
        deleteNodeIds,
      });

      if (result.error && Object.keys(result.nodeResults).length === 0) {
        runtimeActions.setGraphError(result.error.message);
        return;
      }

      let updatedRuntime = new Map(useRuntimeStore.getState().byNodeId);
      const executedNodeIds = Object.keys(result.nodeResults);

      for (const [nodeId, state] of Object.entries(result.nodeResults)) {
        updatedRuntime.set(nodeId, state);
        resolvedNodeIds.add(nodeId);
      }

      updatedRuntime = await updateRuntimeFingerprints(
        workflow,
        updatedRuntime,
        datasets,
        executedNodeIds,
        paramOverrides,
      );

      if (resolvedNodeIds.size > 0) {
        useWorkflowStore.getState().clearStaleForNodes([...resolvedNodeIds]);
      }

      runtimeActions.setNodeStates(Object.fromEntries(updatedRuntime.entries()));
    } catch (err) {
      if (err instanceof CycleError) {
        runtimeActions.setGraphError(err.message);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        runtimeActions.setGraphError(message);
      }
    } finally {
      const latestWorkflow = useWorkflowStore.getState().workflow;
      const latestRuntime = useRuntimeStore.getState();
      for (const node of latestWorkflow.nodes) {
        const runtime = latestRuntime.byNodeId.get(node.id);
        if (runtime?.status === 'running') {
          latestRuntime.setRunning(node.id, false);
        }
      }
      runningRef.current = false;
      latestRuntime.setIsRunning(false);
    }
  }, []);

  runPipelineRef.current = runPipeline;

  const scheduleRun = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runPipelineRef.current?.();
    }, EXECUTION_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (staleNodeIds.size > 0 || deletedNodeIds.length > 0) {
      scheduleRun();
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [staleNodeIds, deletedNodeIds, isHydrated, scheduleRun]);

  return { runPipeline, scheduleRun };
}
