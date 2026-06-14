import { useWorkflowStore } from '@/state/workflow-store';

interface TestBridge {
  connectNodes: (sourceId: string, targetId: string) => string | null;
  getNodeIds: () => string[];
  addParam: (name: string, type: string, defaultValue: unknown) => string | null;
}

declare global {
  interface Window {
    __transformStudioTest?: TestBridge;
  }
}

export function installTestBridge(): void {
  window.__transformStudioTest = {
    connectNodes(sourceId, targetId) {
      return useWorkflowStore.getState().addEdge({ source: sourceId, target: targetId });
    },
    getNodeIds() {
      return useWorkflowStore.getState().workflow.nodes.map((n) => n.id);
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
