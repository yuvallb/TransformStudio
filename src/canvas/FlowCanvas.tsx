import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
  getNodesBounds,
  useNodesInitialized,
  useStore,
  useViewport,
  type Connection,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { validateConnection } from '@/engine/graph-validation';
import type { WorkflowEdge, WorkflowNode } from '@/lib/types';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

import { NodeRenderer, type TransformNodeData } from './NodeRenderer';

const nodeTypes = { transformNode: NodeRenderer };

/** Approximate rendered size — keeps MiniMap usable before DOM measurement. */
const FLOW_NODE_WIDTH = 180;
const FLOW_NODE_HEIGHT = 120;

function toFlowNodes(workflowNodes: WorkflowNode[]): Node<TransformNodeData>[] {
  return workflowNodes.map((n) => ({
    id: n.id,
    type: 'transformNode',
    position: n.position,
    width: FLOW_NODE_WIDTH,
    height: FLOW_NODE_HEIGHT,
    data: { workflowNode: n },
  }));
}

function mergeFlowNodes(
  next: Node<TransformNodeData>[],
  prev: Node<TransformNodeData>[],
): Node<TransformNodeData>[] {
  const prevById = new Map(prev.map((node) => [node.id, node]));
  return next.map((node) => {
    const existing = prevById.get(node.id);
    if (!existing) return node;
    return {
      ...node,
      measured: existing.measured,
      width: existing.width ?? node.width,
      height: existing.height ?? node.height,
    };
  });
}

function toFlowEdges(workflowEdges: WorkflowEdge[]): Edge[] {
  return workflowEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    animated: true,
  }));
}

function areAllNodesInViewport(
  nodes: Node[],
  viewport: Viewport,
  width: number,
  height: number,
): boolean {
  if (nodes.length === 0) return true;

  const bounds = getNodesBounds(nodes);
  if (bounds.width === 0 && bounds.height === 0) return true;

  const { x, y, zoom } = viewport;
  const visibleLeft = -x / zoom;
  const visibleTop = -y / zoom;
  const visibleRight = (width - x) / zoom;
  const visibleBottom = (height - y) / zoom;
  const pad = 16 / zoom;

  return (
    bounds.x >= visibleLeft - pad &&
    bounds.y >= visibleTop - pad &&
    bounds.x + bounds.width <= visibleRight + pad &&
    bounds.y + bounds.height <= visibleBottom + pad
  );
}

function CanvasMiniMap() {
  const viewport = useViewport();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const nodes = useStore((state) => state.nodes);
  const nodesInitialized = useNodesInitialized();

  const showMinimap =
    nodesInitialized &&
    width > 0 &&
    height > 0 &&
    !areAllNodesInViewport(nodes, viewport, width, height);

  if (!showMinimap) return null;

  return (
    <MiniMap
      zoomable
      pannable
      className="!bg-card"
      nodeColor="#64748b"
      nodeStrokeColor="#334155"
      maskColor="rgb(148 163 184 / 0.25)"
    />
  );
}

interface FlowCanvasProps {
  onDropFile?: (file: File, position: { x: number; y: number }) => void;
}

export function FlowCanvas({ onDropFile }: FlowCanvasProps) {
  const workflow = useWorkflowStore((s) => s.workflow);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const compareMode = useUiStore((s) => s.compareMode);
  const addEdgeToStore = useWorkflowStore((s) => s.addEdge);
  const removeEdge = useWorkflowStore((s) => s.removeEdge);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const updateNodePosition = useWorkflowStore((s) => s.updateNodePosition);
  const selectNode = useWorkflowStore((s) => s.selectNode);

  const baseNodes = useMemo(() => {
    const displayNodes = compareMode ? compareMode.targetWorkflow.nodes : workflow.nodes;
    const flowNodes = toFlowNodes(displayNodes).map((n) => ({
      ...n,
      selected: n.id === selectedNodeId,
      draggable: !compareMode,
    }));

    if (compareMode) {
      for (const removedId of compareMode.diff.removed) {
        const removedNode = compareMode.baseWorkflow.nodes.find((n) => n.id === removedId);
        if (removedNode && !flowNodes.some((n) => n.id === removedId)) {
          flowNodes.push({
            id: removedId,
            type: 'transformNode',
            position: removedNode.position,
            width: FLOW_NODE_WIDTH,
            height: FLOW_NODE_HEIGHT,
            draggable: false,
            selectable: true,
            selected: removedId === selectedNodeId,
            data: { workflowNode: removedNode, isGhost: true },
          });
        }
      }
    }

    return flowNodes;
  }, [workflow.nodes, selectedNodeId, compareMode]);

  const baseEdges = useMemo(() => {
    if (!compareMode) {
      return toFlowEdges(workflow.edges);
    }

    const targetEdges = toFlowEdges(compareMode.targetWorkflow.edges);
    const targetEdgeKeys = new Set(
      compareMode.targetWorkflow.edges.map(
        (e) => `${e.source}|${e.target}|${e.sourceHandle ?? ''}|${e.targetHandle ?? ''}`,
      ),
    );

    const removedEdgeKeys = new Set(
      compareMode.baseWorkflow.edges
        .filter(
          (e) =>
            compareMode.diff.removed.includes(e.source) ||
            compareMode.diff.removed.includes(e.target),
        )
        .map((e) => `${e.source}|${e.target}|${e.sourceHandle ?? ''}|${e.targetHandle ?? ''}`),
    );

    const ghostEdges = compareMode.baseWorkflow.edges
      .filter((e) => {
        const key = `${e.source}|${e.target}|${e.sourceHandle ?? ''}|${e.targetHandle ?? ''}`;
        return removedEdgeKeys.has(key) && !targetEdgeKeys.has(key);
      })
      .map((e) => ({
        ...toFlowEdges([e])[0]!,
        style: { stroke: 'rgb(239 68 68)', strokeDasharray: '5 5' },
      }));

    return [...targetEdges, ...ghostEdges];
  }, [workflow.edges, compareMode]);

  const [flowNodes, setFlowNodes] = useState<Node<TransformNodeData>[]>(baseNodes);
  const [flowEdges, setFlowEdges] = useState<Edge[]>(baseEdges);

  useEffect(() => {
    setFlowNodes((prev) => mergeFlowNodes(baseNodes, prev));
  }, [baseNodes]);

  useEffect(() => {
    setFlowEdges(baseEdges);
  }, [baseEdges]);

  const onNodesChange: OnNodesChange<Node<TransformNodeData>> = useCallback(
    (changes) => {
      setFlowNodes((nodes) => applyNodeChanges(changes, nodes));

      for (const change of changes) {
        if (change.type === 'position' && change.position && !compareMode) {
          updateNodePosition(change.id, change.position);
        }
        if (change.type === 'remove' && !compareMode) {
          removeNode(change.id);
        }
        if (change.type === 'select') {
          if (change.selected) {
            selectNode(change.id);
          } else if (selectedNodeId === change.id) {
            selectNode(null);
          }
        }
      }
    },
    [updateNodePosition, removeNode, selectNode, selectedNodeId, compareMode],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setFlowEdges((edges) => applyEdgeChanges(changes, edges));

      if (compareMode) return;
      for (const change of changes) {
        if (change.type === 'remove') {
          removeEdge(change.id);
        }
      }
    },
    [removeEdge, compareMode],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (compareMode) return;
      if (!connection.source || !connection.target) return;

      const sourceNode = workflow.nodes.find((n) => n.id === connection.source);
      const targetNode = workflow.nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      const error = validateConnection(
        sourceNode.type,
        targetNode.type,
        workflow.edges,
        connection.target,
        connection.targetHandle,
      );
      if (error) return;

      addEdgeToStore({
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      });
    },
    [workflow.nodes, workflow.edges, addEdgeToStore, compareMode],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 40,
      };

      if (compareMode) return;

      const nodeType = event.dataTransfer.getData('application/transformstudio-node');
      if (nodeType) {
        useWorkflowStore.getState().addNode(nodeType as WorkflowNode['type'], position);
        return;
      }

      const file = event.dataTransfer.files[0];
      if (file && onDropFile) {
        onDropFile(file, position);
      }
    },
    [onDropFile, compareMode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={compareMode ? undefined : onConnect}
        onPaneClick={onPaneClick}
        nodesDraggable={!compareMode}
        nodesConnectable={!compareMode}
        elementsSelectable
        fitView
        deleteKeyCode={compareMode ? null : ['Backspace', 'Delete']}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls />
        <CanvasMiniMap />
      </ReactFlow>
    </div>
  );
}
