import { describe, expect, it, vi } from 'vitest';

vi.mock('@/engine/kernel-client', () => ({
  kernelClient: {
    validateExpression: vi.fn().mockResolvedValue({ valid: true }),
  },
}));

import { buildPipelineRequest, updateRuntimeFingerprints } from '@/engine/pipeline';
import type { Workflow } from '@/lib/types';

const workflow: Workflow = {
  id: 'wf1',
  name: 'Test',
  schemaVersion: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  params: [],
  nodes: [
    {
      id: 'src',
      type: 'source.csv',
      position: { x: 0, y: 0 },
      config: { filename: 'sales.csv', delimiter: ',', header: true, encoding: 'utf-8' },
    },
    {
      id: 'flt',
      type: 'filter',
      position: { x: 0, y: 0 },
      config: { expression: 'revenue > 1000' },
    },
    {
      id: 'grp',
      type: 'groupby',
      position: { x: 0, y: 0 },
      config: {
        groupColumns: ['region'],
        aggregations: [{ column: 'revenue', func: 'sum' }],
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'src', target: 'flt' },
    { id: 'e2', source: 'flt', target: 'grp' },
  ],
};

const dataset = {
  nodeId: 'src',
  filename: 'sales.csv',
  data: new TextEncoder().encode('region,revenue\nNorth,1500'),
};

function runtimeState(nodeId: string, fingerprint: string) {
  return {
    nodeId,
    status: 'success' as const,
    fingerprint,
    preview: null,
    profile: null,
    error: null,
  };
}

describe('buildPipelineRequest', () => {
  it('skips source node without imported dataset', async () => {
    const request = await buildPipelineRequest({
      workflow,
      staleNodeIds: new Set(['src', 'flt', 'grp']),
      runtimeByNode: new Map(),
      datasets: {},
    });

    expect(request.nodes).toHaveLength(0);
  });

  it('skips nodes that fail validation', async () => {
    const invalidWorkflow: Workflow = {
      ...workflow,
      nodes: workflow.nodes.map((node) =>
        node.id === 'flt' ? { ...node, config: { expression: '' } } : node,
      ),
    };

    const request = await buildPipelineRequest({
      workflow: invalidWorkflow,
      staleNodeIds: new Set(['src', 'flt', 'grp']),
      runtimeByNode: new Map(),
      datasets: { src: dataset },
    });

    expect(request.nodes.map((n) => n.nodeId)).toEqual(['src']);
    expect(request.validationFailures).toHaveLength(1);
    expect(request.validationFailures[0]?.nodeId).toBe('flt');
  });

  it('skips unchanged source on incremental recompute', async () => {
    const runtime = await updateRuntimeFingerprints(
      workflow,
      new Map([
        ['src', runtimeState('src', '')],
        ['flt', runtimeState('flt', '')],
        ['grp', runtimeState('grp', '')],
      ]),
      { src: dataset },
      ['src', 'flt', 'grp'],
    );

    const changedWorkflow: Workflow = {
      ...workflow,
      nodes: workflow.nodes.map((node) =>
        node.id === 'flt' ? { ...node, config: { expression: 'revenue > 2000' } } : node,
      ),
    };

    const second = await buildPipelineRequest({
      workflow: changedWorkflow,
      staleNodeIds: new Set(['flt', 'grp']),
      runtimeByNode: runtime,
      datasets: { src: dataset },
    });

    expect(second.nodes.map((n) => n.nodeId)).toEqual(['flt', 'grp']);
    expect(second.nodes.some((n) => n.nodeId === 'src')).toBe(false);
  });
});
