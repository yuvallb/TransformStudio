import { create } from 'zustand';

import { getNodesReferencingParam } from '@/engine/param-substitute';
import { getDownstreamNodeIds } from '@/engine/topo-sort';
import { defaultParamValue, validateParamName } from '@/lib/param-validation';
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

const MAX_HISTORY = 50;

interface HistorySnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  params: WorkflowParam[];
  datasets: Record<string, NodeDataset>;
}

let historyLock = false;

function snapshotFromWorkflow(workflow: Workflow, datasets: Record<string, NodeDataset>): HistorySnapshot {
  return {
    nodes: structuredClone(workflow.nodes),
    edges: structuredClone(workflow.edges),
    params: structuredClone(workflow.params),
    datasets: structuredClone(datasets),
  };
}

function pushHistory(get: () => WorkflowState): HistorySnapshot[] {
  const state = get();
  if (historyLock || !state.isHydrated) return state.historyPast;

  const snapshot = snapshotFromWorkflow(state.workflow, state.datasets);
  const past = [...state.historyPast, snapshot];
  if (past.length > MAX_HISTORY) {
    past.shift();
  }
  return past;
}

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
  paramOverrides: Record<string, unknown>;

  addNode: (type: WorkflowNode['type'], position: { x: number; y: number }) => string;
  removeNode: (nodeId: string) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  addEdge: (edge: Omit<WorkflowEdge, 'id'>) => string | null;
  removeEdge: (edgeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  markStale: (nodeId: string) => void;
  markStaleForParams: (paramNames: string[]) => void;
  markAllStale: () => void;
  clearStale: () => void;
  clearStaleForNodes: (nodeIds: string[]) => void;
  setDataset: (nodeId: string, dataset: NodeDataset) => void;
  consumeDeletedNodeIds: () => string[];
  setWorkflowName: (name: string) => void;
  addParam: (param: Omit<WorkflowParam, 'default'> & { default?: unknown }) => string | null;
  updateParam: (name: string, updates: Partial<Omit<WorkflowParam, 'name'>>) => string | null;
  removeParam: (name: string) => void;
  setParamOverrides: (overrides: Record<string, unknown>) => void;
  clearParamOverrides: () => void;
  loadWorkflowState: (workflow: Workflow, datasets?: Record<string, NodeDataset>) => void;
  newWorkflow: () => Workflow;
  isHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  editCount: number;
  incrementEditCount: () => void;
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflow: createEmptyWorkflow(),
  selectedNodeId: null,
  staleNodeIds: new Set(),
  datasets: {},
  deletedNodeIds: [],
  paramOverrides: {},
  isHydrated: false,
  editCount: 0,
  historyPast: [],
  historyFuture: [],

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
      historyPast: pushHistory(get),
      historyFuture: [],
      workflow: {
        ...state.workflow,
        nodes: [...state.workflow.nodes, node],
        updatedAt: new Date().toISOString(),
      },
      staleNodeIds: new Set([...state.staleNodeIds, id]),
      editCount: state.isHydrated ? state.editCount + 1 : state.editCount,
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
        historyPast: pushHistory(get),
        historyFuture: [],
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
        editCount: state.isHydrated ? state.editCount + 1 : state.editCount,
      };
    });
  },

  updateNodeConfig(nodeId, config) {
    set((state) => {
      const downstream = getDownstreamNodeIds(nodeId, state.workflow.edges);
      const stale = new Set([nodeId, ...downstream, ...state.staleNodeIds]);

      return {
        historyPast: pushHistory(get),
        historyFuture: [],
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((n) =>
            n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n,
          ),
          updatedAt: new Date().toISOString(),
        },
        staleNodeIds: stale,
        editCount: state.isHydrated ? state.editCount + 1 : state.editCount,
      };
    });
  },

  updateNodePosition(nodeId, position) {
    set((state) => ({
      workflow: {
        ...state.workflow,
        nodes: state.workflow.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
        updatedAt: new Date().toISOString(),
      },
      editCount: state.isHydrated ? state.editCount + 1 : state.editCount,
    }));
  },

  addEdge(edgeInput) {
    const state = get();
    const sourceNode = state.workflow.nodes.find((n) => n.id === edgeInput.source);
    const targetNode = state.workflow.nodes.find((n) => n.id === edgeInput.target);
    if (!sourceNode || !targetNode) return null;

    const targetDef = getNodeDefinition(targetNode.type);
    if (targetDef.category === 'source') return null;

    const incoming = state.workflow.edges.filter((e) => e.target === edgeInput.target);
    if (incoming.length >= targetDef.inputs.length) return null;

    const usedHandles = new Set(
      incoming.map((e) => e.targetHandle ?? targetDef.inputs[0]?.id).filter(Boolean),
    );

    let targetHandle = edgeInput.targetHandle;
    if (targetDef.inputs.length > 1) {
      if (!targetHandle) {
        const available = targetDef.inputs.find((p) => !usedHandles.has(p.id));
        if (!available) return null;
        targetHandle = available.id;
      } else if (usedHandles.has(targetHandle)) {
        return null;
      }
    }

    const duplicate = state.workflow.edges.some(
      (e) =>
        e.source === edgeInput.source &&
        e.target === edgeInput.target &&
        (targetDef.inputs.length <= 1 || e.targetHandle === targetHandle),
    );
    if (duplicate) return null;

    const id = createId();
    const downstream = getDownstreamNodeIds(edgeInput.target, state.workflow.edges);
    const stale = new Set([edgeInput.target, ...downstream, ...state.staleNodeIds]);

    set({
      historyPast: pushHistory(get),
      historyFuture: [],
      workflow: {
        ...state.workflow,
        edges: [...state.workflow.edges, { ...edgeInput, id, targetHandle }],
        updatedAt: new Date().toISOString(),
      },
      staleNodeIds: stale,
      editCount: state.isHydrated ? state.editCount + 1 : state.editCount,
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
        historyPast: pushHistory(get),
        historyFuture: [],
        workflow: {
          ...state.workflow,
          edges: state.workflow.edges.filter((e) => e.id !== edgeId),
          updatedAt: new Date().toISOString(),
        },
        staleNodeIds: stale,
        editCount: state.isHydrated ? state.editCount + 1 : state.editCount,
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

  markStaleForParams(paramNames) {
    set((state) => {
      const stale = new Set(state.staleNodeIds);
      for (const paramName of paramNames) {
        for (const nodeId of getNodesReferencingParam(state.workflow, paramName)) {
          stale.add(nodeId);
          for (const downstreamId of getDownstreamNodeIds(nodeId, state.workflow.edges)) {
            stale.add(downstreamId);
          }
        }
      }
      return { staleNodeIds: stale };
    });
  },

  markAllStale() {
    set((state) => ({ staleNodeIds: new Set(state.workflow.nodes.map((n) => n.id)) }));
  },

  clearStale() {
    set({ staleNodeIds: new Set() });
  },

  clearStaleForNodes(nodeIds) {
    set((state) => {
      const stale = new Set(state.staleNodeIds);
      for (const id of nodeIds) {
        stale.delete(id);
      }
      return { staleNodeIds: stale };
    });
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
      editCount: state.isHydrated ? state.editCount + 1 : state.editCount,
    }));
  },

  addParam(param) {
    const state = get();
    const existingNames = state.workflow.params.map((p) => p.name);
    const error = validateParamName(param.name, existingNames);
    if (error) return error;

    const entry: WorkflowParam = {
      name: param.name.trim(),
      type: param.type,
      label: param.label,
      options: param.options,
      default: param.default ?? defaultParamValue(param.type, param.options),
    };

    if (entry.type === 'enum' && (!entry.options || entry.options.length === 0)) {
      return 'Enum parameters require at least one option';
    }

    set({
      historyPast: pushHistory(get),
      historyFuture: [],
      workflow: {
        ...state.workflow,
        params: [...state.workflow.params, entry],
        updatedAt: new Date().toISOString(),
      },
      editCount: state.isHydrated ? state.editCount + 1 : state.editCount,
    });

    get().markStaleForParams([entry.name]);

    return null;
  },

  updateParam(name, updates) {
    const state = get();
    const index = state.workflow.params.findIndex((p) => p.name === name);
    if (index < 0) return 'Parameter not found';

    const current = state.workflow.params[index]!;
    const nextType = updates.type ?? current.type;
    const nextOptions = updates.options ?? current.options;
    let nextDefault = updates.default ?? current.default;
    if (updates.type && updates.type !== current.type && updates.default === undefined) {
      nextDefault = defaultParamValue(nextType, nextOptions);
    }

    const updated: WorkflowParam = {
      ...current,
      ...updates,
      name: current.name,
      type: nextType,
      options: nextOptions,
      default: nextDefault,
    };

    if (updated.type === 'enum' && (!updated.options || updated.options.length === 0)) {
      return 'Enum parameters require at least one option';
    }

    const params = [...state.workflow.params];
    params[index] = updated;

    set({
      historyPast: pushHistory(get),
      historyFuture: [],
      workflow: {
        ...state.workflow,
        params,
        updatedAt: new Date().toISOString(),
      },
      editCount: state.isHydrated ? state.editCount + 1 : state.editCount,
    });

    get().markStaleForParams([name]);

    return null;
  },

  removeParam(name) {
    set((state) => {
      const overrides = { ...state.paramOverrides };
      delete overrides[name];

      return {
        historyPast: pushHistory(get),
        historyFuture: [],
        workflow: {
          ...state.workflow,
          params: state.workflow.params.filter((p) => p.name !== name),
          updatedAt: new Date().toISOString(),
        },
        paramOverrides: overrides,
        editCount: state.isHydrated ? state.editCount + 1 : state.editCount,
      };
    });
    get().markStaleForParams([name]);
  },

  setParamOverrides(overrides) {
    set({ paramOverrides: overrides });
    get().markStaleForParams(Object.keys(overrides));
  },

  clearParamOverrides() {
    const previous = get().paramOverrides;
    if (Object.keys(previous).length === 0) return;
    set({ paramOverrides: {} });
    get().markStaleForParams(Object.keys(previous));
  },

  loadWorkflowState(workflow, datasets = {}) {
    const prevNodeIds = get().workflow.nodes.map((n) => n.id);
    set({
      workflow,
      selectedNodeId: null,
      staleNodeIds: new Set(workflow.nodes.map((n) => n.id)),
      datasets,
      deletedNodeIds: [...get().deletedNodeIds, ...prevNodeIds],
      paramOverrides: {},
      editCount: 0,
      historyPast: [],
      historyFuture: [],
    });
  },

  newWorkflow() {
    const workflow = createEmptyWorkflow();
    set({
      workflow,
      selectedNodeId: null,
      staleNodeIds: new Set(),
      datasets: {},
      deletedNodeIds: [],
      paramOverrides: {},
      editCount: 0,
      historyPast: [],
      historyFuture: [],
    });
    return workflow;
  },

  setHydrated(hydrated) {
    set({ isHydrated: hydrated });
  },

  incrementEditCount() {
    set((state) => ({ editCount: state.editCount + 1 }));
  },

  undo() {
    const state = get();
    if (state.historyPast.length === 0) return;

    historyLock = true;
    try {
      const previous = state.historyPast[state.historyPast.length - 1]!;
      const current = snapshotFromWorkflow(state.workflow, state.datasets);

      set({
        historyPast: state.historyPast.slice(0, -1),
        historyFuture: [current, ...state.historyFuture],
        workflow: {
          ...state.workflow,
          nodes: previous.nodes,
          edges: previous.edges,
          params: previous.params,
          updatedAt: new Date().toISOString(),
        },
        datasets: previous.datasets,
        staleNodeIds: new Set(previous.nodes.map((n) => n.id)),
        selectedNodeId: state.selectedNodeId,
      });
    } finally {
      historyLock = false;
    }
  },

  redo() {
    const state = get();
    if (state.historyFuture.length === 0) return;

    historyLock = true;
    try {
      const next = state.historyFuture[0]!;
      const current = snapshotFromWorkflow(state.workflow, state.datasets);

      set({
        historyPast: [...state.historyPast, current],
        historyFuture: state.historyFuture.slice(1),
        workflow: {
          ...state.workflow,
          nodes: next.nodes,
          edges: next.edges,
          params: next.params,
          updatedAt: new Date().toISOString(),
        },
        datasets: next.datasets,
        staleNodeIds: new Set(next.nodes.map((n) => n.id)),
        selectedNodeId: state.selectedNodeId,
      });
    } finally {
      historyLock = false;
    }
  },

  canUndo() {
    return get().historyPast.length > 0;
  },

  canRedo() {
    return get().historyFuture.length > 0;
  },
}));

export function useWorkflowParams(): WorkflowParam[] {
  return useWorkflowStore((s) => s.workflow.params);
}
