import { create } from 'zustand';

import type { NodeRuntimeState } from '@/lib/types';

interface RuntimeState {
  byNodeId: Map<string, NodeRuntimeState>;
  graphError: string | null;
  isRunning: boolean;

  setNodeState: (nodeId: string, state: NodeRuntimeState) => void;
  setNodeStates: (states: Record<string, NodeRuntimeState>) => void;
  setRunning: (nodeId: string, running: boolean) => void;
  setGraphError: (error: string | null) => void;
  setIsRunning: (running: boolean) => void;
  clearNode: (nodeId: string) => void;
  reset: () => void;
}

const defaultRuntime = (): NodeRuntimeState => ({
  nodeId: '',
  status: 'idle',
  fingerprint: null,
  preview: null,
  profile: null,
  error: null,
  traceback: null,
});

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  byNodeId: new Map(),
  graphError: null,
  isRunning: false,

  setNodeState(nodeId, state) {
    const next = new Map(get().byNodeId);
    next.set(nodeId, state);
    set({ byNodeId: next });
  },

  setNodeStates(states) {
    const next = new Map(get().byNodeId);
    for (const [nodeId, state] of Object.entries(states)) {
      next.set(nodeId, state);
    }
    set({ byNodeId: next });
  },

  setRunning(nodeId, running) {
    const next = new Map(get().byNodeId);
    const existing = next.get(nodeId) ?? { ...defaultRuntime(), nodeId };
    const status = running
      ? 'running'
      : existing.status === 'running'
        ? 'stale'
        : existing.status;
    next.set(nodeId, { ...existing, status });
    set({ byNodeId: next });
  },

  setGraphError(error) {
    set({ graphError: error });
  },

  setIsRunning(running) {
    set({ isRunning: running });
  },

  clearNode(nodeId) {
    const next = new Map(get().byNodeId);
    next.delete(nodeId);
    set({ byNodeId: next });
  },

  reset() {
    set({ byNodeId: new Map(), graphError: null, isRunning: false });
  },
}));

export function useSelectedNodeRuntime(nodeId: string | null): NodeRuntimeState | null {
  return useRuntimeStore((s) => (nodeId ? (s.byNodeId.get(nodeId) ?? null) : null));
}
