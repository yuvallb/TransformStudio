import { create } from 'zustand';

import { getDownstreamNodeIds } from '@/engine/topo-sort';
import { WORKFLOW_SCHEMA_VERSION } from '@/lib/constants';
import type {
  NodeDataset,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowParam,
} from '@/lib/types';
import { createId } from '@/lib/utils';
import { getNodeDefinition } from '@/nodes/registry';

function createEmptyWorkflow(): Workflow {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name: 'Untitled Pipeline',
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    nodes: [],
    edges: [],
    params: [],
    createdAt: now,
    updatedAt: now,
  };
}

interface WorkflowState {
  workflow: Workflow;
  selectedNodeId: string | null;
  staleNodeIds: Set<string>;
  datasets: Record<string, NodeDataset>;
  deletedNodeIds: string[];

  addNode: (type: WorkflowNode['type'], position: { x: number; y: number }) => string;
  removeNode: (nodeId: string) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  addEdge: (edge: Omit<WorkflowEdge, 'id'>) => string | null;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  markStale: (nodeId: string) => void;
  markAllStale: () => void;
  clearStale: () => void;
  setDataset: (nodeId: string, dataset: NodeDataset) => void;
  consumeDeletedNodeIds: () => string[];
  setWorkflowName: (name: string) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflow: createEmptyWorkflow(),
  selectedNodeId: null,
  staleNodeIds: new Set(),
  datasets: {},
  deletedNodeIds: [],

  addNode(type, position) {
    const def = getNodeDefinition(type);
    const id = createId();
    const node: WorkflowNode = {
      id,
      type,
      position,
      config: def.defaultConfig(),
    };

    set((state) => ({
      workflow: {
        ...state.workflow,
        nodes: [...state.workflow.nodes, node],
        updatedAt: new Date().toISOString(),
      },
      staleNodeIds: new Set([...state.staleNodeIds, id]),
    }));

    return id;
  },

  removeNode(nodeId) {
    set((state) => {
      const downstream = getDownstreamNodeIds(nodeId, state.workflow.edges);
      const stale = new Set(state.staleNodeIds);
      for (const id of downstream) stale.add(id);

      const remainingDatasets = { ...state.datasets };
      delete remainingDatasets[nodeId];

      return {
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.filter((n) => n.id !== nodeId),
          edges: state.workflow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
          updatedAt: new Date().toISOString(),
        },
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        staleNodeIds: stale,
        datasets: remainingDatasets,
        deletedNodeIds: [...state.deletedNodeIds, nodeId],
      };
    });
  },

  updateNodeConfig(nodeId, config) {
    set((state) => {
      const downstream = getDownstreamNodeIds(nodeId, state.workflow.edges);
      const stale = new Set([nodeId, ...downstream, ...state.staleNodeIds]);

      return {
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((n) =>
            n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n,
          ),
          updatedAt: new Date().toISOString(),
        },
        staleNodeIds: stale,
      };
    });
  },

  updateNodePosition(nodeId, position) {
    set((state) => ({
      workflow: {
        ...state.workflow,
        nodes: state.workflow.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      },
    }));
  },

  addEdge(edgeInput) {
    const state = get();
    const sourceNode = state.workflow.nodes.find((n) => n.id === edgeInput.source);
    const targetNode = state.workflow.nodes.find((n) => n.id === edgeInput.target);
    if (!sourceNode || !targetNode) return null;

    const targetDef = getNodeDefinition(targetNode.type);
    if (targetDef.category === 'source') return null;

    const existing = state.workflow.edges.filter((e) => e.target === edgeInput.target).length;
    if (existing >= targetDef.inputs.length) return null;

    const duplicate = state.workflow.edges.some(
      (e) => e.source === edgeInput.source && e.target === edgeInput.target,
    );
    if (duplicate) return null;

    const id = createId();
    const downstream = getDownstreamNodeIds(edgeInput.target, state.workflow.edges);
    const stale = new Set([edgeInput.target, ...downstream, ...state.staleNodeIds]);

    set({
      workflow: {
        ...state.workflow,
        edges: [...state.workflow.edges, { ...edgeInput, id }],
        updatedAt: new Date().toISOString(),
      },
      staleNodeIds: stale,
    });

    return id;
  },

  removeEdge(edgeId) {
    set((state) => {
      const edge = state.workflow.edges.find((e) => e.id === edgeId);
      if (!edge) return state;

      const downstream = getDownstreamNodeIds(edge.target, state.workflow.edges);
      const stale = new Set([edge.target, ...downstream, ...state.staleNodeIds]);

      return {
        workflow: {
          ...state.workflow,
          edges: state.workflow.edges.filter((e) => e.id !== edgeId),
          updatedAt: new Date().toISOString(),
        },
        staleNodeIds: stale,
      };
    });
  },

  selectNode(nodeId) {
    set({ selectedNodeId: nodeId });
  },

  markStale(nodeId) {
    set((state) => {
      const downstream = getDownstreamNodeIds(nodeId, state.workflow.edges);
      return { staleNodeIds: new Set([nodeId, ...downstream, ...state.staleNodeIds]) };
    });
  },

  markAllStale() {
    set((state) => ({ staleNodeIds: new Set(state.workflow.nodes.map((n) => n.id)) }));
  },

  clearStale() {
    set({ staleNodeIds: new Set() });
  },

  setDataset(nodeId, dataset) {
    set((state) => {
      const stale = new Set([nodeId, ...state.staleNodeIds]);
      const downstream = getDownstreamNodeIds(nodeId, state.workflow.edges);
      for (const id of downstream) stale.add(id);

      return {
        datasets: { ...state.datasets, [nodeId]: dataset },
        staleNodeIds: stale,
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((n) =>
            n.id === nodeId ? { ...n, config: { ...n.config, filename: dataset.filename } } : n,
          ),
        },
      };
    });
  },

  consumeDeletedNodeIds() {
    const ids = get().deletedNodeIds;
    set({ deletedNodeIds: [] });
    return ids;
  },

  setWorkflowName(name) {
    set((state) => ({
      workflow: { ...state.workflow, name, updatedAt: new Date().toISOString() },
    }));
  },
}));

export function useWorkflowParams(): WorkflowParam[] {
  return useWorkflowStore((s) => s.workflow.params);
}
