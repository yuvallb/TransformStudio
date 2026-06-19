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
  const toastedErrorsRef = useRef(new Set<string>());

  const workflow = useWorkflowStore((s) => s.workflow);
  const staleNodeIds = useWorkflowStore((s) => s.staleNodeIds);
  const deletedNodeIds = useWorkflowStore((s) => s.deletedNodeIds);
  const isHydrated = useWorkflowStore((s) => s.isHydrated);
  const datasets = useWorkflowStore((s) => s.datasets);
  const clearStaleForNodes = useWorkflowStore((s) => s.clearStaleForNodes);
  const consumeDeletedNodeIds = useWorkflowStore((s) => s.consumeDeletedNodeIds);

  const setNodeStates = useRuntimeStore((s) => s.setNodeStates);
  const setGraphError = useRuntimeStore((s) => s.setGraphError);
  const setIsRunning = useRuntimeStore((s) => s.setIsRunning);
  const setRunning = useRuntimeStore((s) => s.setRunning);
  const byNodeId = useRuntimeStore((s) => s.byNodeId);
  const clearNode = useRuntimeStore((s) => s.clearNode);

  const toastErrorOnce = useCallback((message: string) => {
    if (toastedErrorsRef.current.has(message)) return;
    toastedErrorsRef.current.add(message);
    toast.error(message);
  }, []);

  const runPipeline = useCallback(async () => {
    if (runningRef.current) return;

    const pendingDeletes = useWorkflowStore.getState().deletedNodeIds;
    if (workflow.nodes.length === 0 && pendingDeletes.length === 0) return;

    runningRef.current = true;
    setIsRunning(true);
    setGraphError(null);
    toastedErrorsRef.current.clear();

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

      const resolvedNodeIds = new Set<string>();

      if (request.validationFailures.length > 0) {
        const updatedRuntime = new Map(byNodeId);
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
        setNodeStates(Object.fromEntries(updatedRuntime.entries()));
      }

      if (request.nodes.length === 0 && deleteNodeIds.length === 0) {
        if (resolvedNodeIds.size > 0) {
          clearStaleForNodes([...resolvedNodeIds]);
        }
        return;
      }

      if (request.nodes.length > 0) {
        const cleared = new Map(useRuntimeStore.getState().byNodeId);
        for (const node of request.nodes) {
          setRunning(node.nodeId, true);
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
        toastErrorOnce(result.error.message);
        return;
      }

      let updatedRuntime = new Map(byNodeId);
      const executedNodeIds = Object.keys(result.nodeResults);

      for (const [nodeId, state] of Object.entries(result.nodeResults)) {
        updatedRuntime.set(nodeId, state);
        resolvedNodeIds.add(nodeId);
        if (state.status === 'error') {
          toastErrorOnce(`Node failed: ${state.error ?? result.error?.message ?? 'Unknown error'}`);
        }
      }

      updatedRuntime = await updateRuntimeFingerprints(
        workflow,
        updatedRuntime,
        datasets,
        executedNodeIds,
        paramOverrides,
      );

      const statesObj = Object.fromEntries(updatedRuntime.entries());
      setNodeStates(statesObj);

      if (resolvedNodeIds.size > 0) {
        clearStaleForNodes([...resolvedNodeIds]);
      }
    } catch (err) {
      if (err instanceof CycleError) {
        setGraphError(err.message);
        toastErrorOnce(err.message);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setGraphError(message);
        toastErrorOnce(message);
      }
    } finally {
      for (const node of workflow.nodes) {
        const runtime = useRuntimeStore.getState().byNodeId.get(node.id);
        if (runtime?.status === 'running') {
          setRunning(node.id, false);
        }
      }
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
    setRunning,
    toastErrorOnce,
  ]);

  const scheduleRun = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runPipeline();
    }, EXECUTION_DEBOUNCE_MS);
  }, [runPipeline]);

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
