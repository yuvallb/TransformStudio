import { describe, expect, it } from 'vitest';

import { CycleError, getDownstreamNodeIds, topoSort } from '@/engine/topo-sort';
import type { WorkflowEdge, WorkflowNode } from '@/lib/types';

const nodes: WorkflowNode[] = [
  { id: 'a', type: 'source.csv', position: { x: 0, y: 0 }, config: {} },
  { id: 'b', type: 'filter', position: { x: 0, y: 0 }, config: {} },
  { id: 'c', type: 'groupby', position: { x: 0, y: 0 }, config: {} },
  { id: 'd', type: 'output', position: { x: 0, y: 0 }, config: {} },
];

describe('topoSort', () => {
  it('sorts a linear pipeline', () => {
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'c', target: 'd' },
    ];

    const sorted = topoSort(nodes, edges);
    expect(sorted.map((n) => n.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sorts a diamond graph', () => {
    const diamondNodes: WorkflowNode[] = [
      { id: 'a', type: 'source.csv', position: { x: 0, y: 0 }, config: {} },
      { id: 'b', type: 'filter', position: { x: 0, y: 0 }, config: {} },
      { id: 'c', type: 'filter', position: { x: 0, y: 0 }, config: {} },
      { id: 'd', type: 'groupby', position: { x: 0, y: 0 }, config: {} },
    ];
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'a', target: 'c' },
      { id: 'e3', source: 'b', target: 'd' },
      { id: 'e4', source: 'c', target: 'd' },
    ];

    const sorted = topoSort(diamondNodes, edges);
    expect(sorted[0].id).toBe('a');
    expect(sorted[sorted.length - 1].id).toBe('d');
  });

  it('throws on cycle', () => {
    const cycleEdges: WorkflowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'c', target: 'a' },
    ];

    expect(() => topoSort(nodes.slice(0, 3), cycleEdges)).toThrow(CycleError);
  });
});

describe('getDownstreamNodeIds', () => {
  it('returns all transitive downstream nodes', () => {
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'c', target: 'd' },
    ];

    expect(getDownstreamNodeIds('a', edges).sort()).toEqual(['b', 'c', 'd']);
    expect(getDownstreamNodeIds('b', edges).sort()).toEqual(['c', 'd']);
    expect(getDownstreamNodeIds('d', edges)).toEqual([]);
  });
});
