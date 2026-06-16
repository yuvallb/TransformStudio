import { useWorkflowStore } from '@/state/workflow-store';

interface TestBridge {
  connectNodes: (sourceId: string, targetId: string) => string | null;
  getNodeIds: () => string[];
  selectNodeByLabel: (label: string) => string | null;
  addParam: (name: string, type: string, defaultValue: unknown) => string | null;
}

declare global {
  interface Window {
    __transformStudioTest?: TestBridge;
  }
}

function findNodeIdByLabel(label: string): string | null {
  const ids = useWorkflowStore.getState().workflow.nodes.map((n) => n.id);
  return (
    ids.find((id) =>
      document.querySelector(`[data-testid="rf__node-${id}"]`)?.textContent?.includes(label),
    ) ?? null
  );
}

export function installTestBridge(): void {
  window.__transformStudioTest = {
    connectNodes(sourceId, targetId) {
      return useWorkflowStore.getState().addEdge({ source: sourceId, target: targetId });
    },
    getNodeIds() {
      return useWorkflowStore.getState().workflow.nodes.map((n) => n.id);
    },
    selectNodeByLabel(label) {
      const id = findNodeIdByLabel(label);
      if (!id) return null;
      useWorkflowStore.getState().selectNode(id);
      return id;
    },
    addParam(name, type, defaultValue) {
      return useWorkflowStore.getState().addParam({
        name,
        type: type as 'string' | 'number' | 'date' | 'enum' | 'boolean',
        default: defaultValue,
      });
    },
  };
}
