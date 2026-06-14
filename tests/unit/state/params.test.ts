import { beforeEach, describe, expect, it } from 'vitest';

import { validateParamName } from '@/lib/param-validation';
import { useWorkflowStore } from '@/state/workflow-store';

describe('workflow params', () => {
  beforeEach(() => {
    useWorkflowStore.setState({
      workflow: {
        id: 'wf1',
        name: 'Test',
        schemaVersion: 1,
        nodes: [],
        edges: [],
        params: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      paramOverrides: {},
      staleNodeIds: new Set(),
      datasets: {},
      deletedNodeIds: [],
      selectedNodeId: null,
    });
  });

  it('rejects invalid param names', () => {
    expect(validateParamName('', [])).toBeTruthy();
    expect(validateParamName('1bad', [])).toBeTruthy();
    expect(validateParamName('import', [])).toBeTruthy();
    expect(validateParamName('country', [])).toBeNull();
  });

  it('rejects duplicate param names', () => {
    const error = useWorkflowStore.getState().addParam({
      name: 'country',
      type: 'string',
      default: 'US',
    });
    expect(error).toBeNull();

    const dup = useWorkflowStore.getState().addParam({
      name: 'country',
      type: 'string',
      default: 'UK',
    });
    expect(dup).toBeTruthy();
  });

  it('rejects enum params without options', () => {
    const error = useWorkflowStore.getState().addParam({
      name: 'region',
      type: 'enum',
      default: '',
      options: [],
    });
    expect(error).toContain('at least one option');
  });

  it('adds and removes params', () => {
    useWorkflowStore.getState().addParam({ name: 'country', type: 'string', default: 'US' });
    expect(useWorkflowStore.getState().workflow.params).toHaveLength(1);

    useWorkflowStore.getState().removeParam('country');
    expect(useWorkflowStore.getState().workflow.params).toHaveLength(0);
  });

  it('updates param default and marks stale for referencing nodes', () => {
    useWorkflowStore.setState((state) => ({
      workflow: {
        ...state.workflow,
        nodes: [
          {
            id: 'flt',
            type: 'filter',
            position: { x: 0, y: 0 },
            config: { expression: 'country == {country}' },
          },
        ],
      },
    }));

    useWorkflowStore.getState().addParam({ name: 'country', type: 'string', default: 'US' });
    useWorkflowStore.getState().clearStale();

    useWorkflowStore.getState().updateParam('country', { default: 'UK' });
    expect(useWorkflowStore.getState().staleNodeIds.has('flt')).toBe(true);
  });
});
