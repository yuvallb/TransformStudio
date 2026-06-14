import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { validateConnection } from '@/engine/codegen';
import type { WorkflowEdge, WorkflowNode } from '@/lib/types';
import { useWorkflowStore } from '@/state/workflow-store';

import { NodeRenderer, type TransformNodeData } from './NodeRenderer';

const nodeTypes = { transformNode: NodeRenderer };

function toFlowNodes(workflowNodes: WorkflowNode[]): Node<TransformNodeData>[] {
  return workflowNodes.map((n) => ({
    id: n.id,
    type: 'transformNode',
    position: n.position,
    data: { workflowNode: n },
  }));
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

interface FlowCanvasProps {
  onDropFile?: (file: File, position: { x: number; y: number }) => void;
}

export function FlowCanvas({ onDropFile }: FlowCanvasProps) {
  const workflow = useWorkflowStore((s) => s.workflow);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const addEdgeToStore = useWorkflowStore((s) => s.addEdge);
  const removeEdge = useWorkflowStore((s) => s.removeEdge);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const updateNodePosition = useWorkflowStore((s) => s.updateNodePosition);
  const selectNode = useWorkflowStore((s) => s.selectNode);

  const nodes = useMemo(
    () =>
      toFlowNodes(workflow.nodes).map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [workflow.nodes, selectedNodeId],
  );
  const edges = useMemo(() => toFlowEdges(workflow.edges), [workflow.edges]);

  const onNodesChange: OnNodesChange<Node<TransformNodeData>> = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position);
        }
        if (change.type === 'remove') {
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
    [updateNodePosition, removeNode, selectNode, selectedNodeId],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          removeEdge(change.id);
        }
      }
    },
    [removeEdge],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = workflow.nodes.find((n) => n.id === connection.source);
      const targetNode = workflow.nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      const error = validateConnection(
        sourceNode.type,
        targetNode.type,
        workflow.edges,
        connection.target,
      );
      if (error) return;

      addEdgeToStore({
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      });
    },
    [workflow.nodes, workflow.edges, addEdgeToStore],
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
    [onDropFile],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap zoomable pannable className="!bg-card" />
      </ReactFlow>
    </div>
  );
}
