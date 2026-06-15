import { beforeEach, describe, expect, it } from 'vitest';

import { useWorkflowStore } from '@/state/workflow-store';

describe('workflow undo/redo', () => {
  beforeEach(() => {
    useWorkflowStore.getState().newWorkflow();
    useWorkflowStore.getState().setHydrated(true);
  });

  it('undoes addNode', () => {
    const id = useWorkflowStore.getState().addNode('filter', { x: 0, y: 0 });
    expect(useWorkflowStore.getState().workflow.nodes).toHaveLength(1);

    useWorkflowStore.getState().undo();
    expect(useWorkflowStore.getState().workflow.nodes).toHaveLength(0);
    expect(useWorkflowStore.getState().canUndo()).toBe(false);

    useWorkflowStore.getState().redo();
    expect(useWorkflowStore.getState().workflow.nodes).toHaveLength(1);
    expect(useWorkflowStore.getState().workflow.nodes[0]?.id).toBe(id);
  });

  it('undoes removeNode', () => {
    const id = useWorkflowStore.getState().addNode('filter', { x: 0, y: 0 });
    useWorkflowStore.getState().removeNode(id);
    expect(useWorkflowStore.getState().workflow.nodes).toHaveLength(0);

    useWorkflowStore.getState().undo();
    expect(useWorkflowStore.getState().workflow.nodes).toHaveLength(1);
  });

  it('does not record history before hydration', () => {
    useWorkflowStore.getState().newWorkflow();
    useWorkflowStore.getState().setHydrated(false);
    useWorkflowStore.getState().addNode('filter', { x: 0, y: 0 });
    expect(useWorkflowStore.getState().canUndo()).toBe(false);
  });
});
