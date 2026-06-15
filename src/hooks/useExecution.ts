import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { CycleError } from '@/engine/topo-sort';
import { buildPipelineRequest, updateRuntimeFingerprints } from '@/engine/pipeline';
import { kernelClient } from '@/engine/kernel-client';
import { EXECUTION_DEBOUNCE_MS } from '@/lib/constants';
import { useRuntimeStore } from '@/state/runtime-store';
import { useWorkflowStore } from '@/state/workflow-store';

export function useExecution() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);

  const workflow = useWorkflowStore((s) => s.workflow);
  const staleNodeIds = useWorkflowStore((s) => s.staleNodeIds);
  const isHydrated = useWorkflowStore((s) => s.isHydrated);
  const datasets = useWorkflowStore((s) => s.datasets);
  const clearStaleForNodes = useWorkflowStore((s) => s.clearStaleForNodes);
  const consumeDeletedNodeIds = useWorkflowStore((s) => s.consumeDeletedNodeIds);

  const setNodeStates = useRuntimeStore((s) => s.setNodeStates);
  const setGraphError = useRuntimeStore((s) => s.setGraphError);
  const setIsRunning = useRuntimeStore((s) => s.setIsRunning);
  const byNodeId = useRuntimeStore((s) => s.byNodeId);
  const clearNode = useRuntimeStore((s) => s.clearNode);

  const runPipeline = useCallback(async () => {
    if (runningRef.current) return;
    if (workflow.nodes.length === 0) return;

    runningRef.current = true;
    setIsRunning(true);
    setGraphError(null);

    try {
      const deleteNodeIds = consumeDeletedNodeIds();
      for (const nodeId of deleteNodeIds) {
        clearNode(nodeId);
      }

      const paramOverrides = useWorkflowStore.getState().paramOverrides;
      const request = await buildPipelineRequest({
        workflow,
        staleNodeIds,
        runtimeByNode: byNodeId,
        datasets,
        paramOverrides,
      });

      if (request.validationFailures.length > 0) {
        const updatedRuntime = new Map(byNodeId);
        for (const failure of request.validationFailures) {
          const existing = updatedRuntime.get(failure.nodeId);
          updatedRuntime.set(failure.nodeId, {
            nodeId: failure.nodeId,
            status: 'error',
            fingerprint: existing?.fingerprint ?? null,
            preview: existing?.preview ?? null,
            profile: existing?.profile ?? null,
            error: failure.message,
          });
        }
        setNodeStates(Object.fromEntries(updatedRuntime.entries()));
      }

      if (request.nodes.length === 0 && deleteNodeIds.length === 0) {
        return;
      }

      if (request.nodes.length > 0) {
        const cleared = new Map(useRuntimeStore.getState().byNodeId);
        for (const node of request.nodes) {
          const existing = cleared.get(node.nodeId);
          if (existing) {
            cleared.set(node.nodeId, { ...existing, profile: null });
          }
        }
        setNodeStates(Object.fromEntries(cleared.entries()));
      }

      const result = await kernelClient.executePipeline({
        nodes: request.nodes,
        params: request.params,
        deleteNodeIds,
      });

      if (result.error && Object.keys(result.nodeResults).length === 0) {
        setGraphError(result.error.message);
        toast.error(result.error.message);
        return;
      }

      const executedIds = Object.keys(result.nodeResults);
      let updatedRuntime = new Map(byNodeId);

      for (const [nodeId, state] of Object.entries(result.nodeResults)) {
        updatedRuntime.set(nodeId, state);
        if (state.status === 'error') {
          toast.error(`Node failed: ${state.error ?? result.error?.message}`);
        }
      }

      updatedRuntime = await updateRuntimeFingerprints(
        workflow,
        updatedRuntime,
        datasets,
        executedIds,
        paramOverrides,
      );

      const statesObj = Object.fromEntries(updatedRuntime.entries());
      setNodeStates(statesObj);

      const successfulIds = executedIds.filter(
        (nodeId) => result.nodeResults[nodeId]?.status === 'success',
      );
      if (successfulIds.length > 0) {
        clearStaleForNodes(successfulIds);
      }
    } catch (err) {
      if (err instanceof CycleError) {
        setGraphError(err.message);
        toast.error(err.message);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setGraphError(message);
        toast.error(message);
      }
    } finally {
      runningRef.current = false;
      setIsRunning(false);
    }
  }, [
    workflow,
    staleNodeIds,
    datasets,
    byNodeId,
    clearStaleForNodes,
    consumeDeletedNodeIds,
    clearNode,
    setNodeStates,
    setGraphError,
    setIsRunning,
  ]);

  const scheduleRun = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runPipeline();
    }, EXECUTION_DEBOUNCE_MS);
  }, [runPipeline]);

  useEffect(() => {
    if (!isHydrated) return;
    if (staleNodeIds.size > 0) {
      scheduleRun();
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [staleNodeIds, isHydrated, scheduleRun]);

  return { runPipeline, scheduleRun };
}
