import { describe, expect, it } from 'vitest';

import { diffWorkflowParams, diffWorkflows } from '@/versioning/diff';
import type { Workflow } from '@/lib/types';

function workflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'wf-1',
    name: 'Test',
    schemaVersion: 1,
    nodes: [],
    edges: [],
    params: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('diffWorkflows', () => {
  it('detects added and removed nodes', () => {
    const base = workflow({
      nodes: [
        {
          id: 'a',
          type: 'filter',
          position: { x: 0, y: 0 },
          config: { expression: 'x > 1' },
        },
      ],
    });

    const target = workflow({
      nodes: [
        {
          id: 'b',
          type: 'groupby',
          position: { x: 0, y: 0 },
          config: { groupColumns: ['x'], aggregations: [] },
        },
      ],
    });

    const diff = diffWorkflows(base, target);
    expect(diff.added).toEqual(['b']);
    expect(diff.removed).toEqual(['a']);
  });

  it('detects modified node config', () => {
    const node = {
      id: 'a',
      type: 'filter' as const,
      position: { x: 0, y: 0 },
      config: { expression: 'x > 1' },
    };

    const base = workflow({ nodes: [node] });
    const target = workflow({
      nodes: [{ ...node, config: { expression: 'x > 2' } }],
    });

    const diff = diffWorkflows(base, target);
    expect(diff.modified).toEqual(['a']);
    expect(diff.configDiffs.a).toEqual([
      { field: 'expression', oldValue: 'x > 1', newValue: 'x > 2' },
    ]);
  });

  it('marks unchanged nodes', () => {
    const node = {
      id: 'a',
      type: 'filter' as const,
      position: { x: 0, y: 0 },
      config: { expression: 'x > 1' },
    };

    const base = workflow({ nodes: [node] });
    const target = workflow({ nodes: [{ ...node }] });

    const diff = diffWorkflows(base, target);
    expect(diff.unchanged).toEqual(['a']);
    expect(diff.modified).toEqual([]);
  });

  it('flags params changes', () => {
    const base = workflow({
      params: [{ name: 'country', type: 'string', default: 'US' }],
    });
    const target = workflow({
      params: [{ name: 'country', type: 'string', default: 'UK' }],
    });

    const diff = diffWorkflows(base, target);
    expect(diff.paramsChanged).toBe(true);
  });

  it('returns parameter-level diffs', () => {
    const base = workflow({
      params: [{ name: 'country', type: 'string', default: 'US' }],
    });
    const target = workflow({
      params: [{ name: 'country', type: 'string', default: 'UK' }],
    });

    expect(diffWorkflowParams(base, target)).toEqual([
      {
        field: 'country',
        oldValue: { name: 'country', type: 'string', default: 'US' },
        newValue: { name: 'country', type: 'string', default: 'UK' },
      },
    ]);
  });
});
