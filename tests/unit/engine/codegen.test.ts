import { describe, expect, it } from 'vitest';

import { generatePipelineCode } from '@/engine/codegen';
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
    {
      id: 'out',
      type: 'output',
      position: { x: 0, y: 0 },
      config: { format: 'csv', filename: 'output.csv' },
    },
  ],
  edges: [
    { id: 'e1', source: 'src', target: 'flt' },
    { id: 'e2', source: 'flt', target: 'grp' },
    { id: 'e3', source: 'grp', target: 'out' },
  ],
};

describe('generatePipelineCode', () => {
  it('generates topo-ordered pandas script', () => {
    const code = generatePipelineCode(workflow);

    expect(code).toContain('import pandas as pd');
    expect(code).toContain('pd.read_csv');
    expect(code).toContain('groupby');
    expect(code).toContain('.eval(');
    expect(code).toContain('to_csv');

    const srcIdx = code.indexOf('read_csv');
    const filterIdx = code.indexOf('.eval(');
    const groupIdx = code.indexOf('groupby');
    const outIdx = code.indexOf('to_csv');

    expect(srcIdx).toBeLessThan(filterIdx);
    expect(filterIdx).toBeLessThan(groupIdx);
    expect(groupIdx).toBeLessThan(outIdx);
  });

  it('includes params dict when workflow has parameters', () => {
    const withParams: Workflow = {
      ...workflow,
      params: [
        { name: 'country', type: 'string', default: 'US' },
        { name: 'min_revenue', type: 'number', default: 1000 },
      ],
      nodes: workflow.nodes.map((n) =>
        n.id === 'flt' ? { ...n, config: { expression: 'df["country"] == {country}' } } : n,
      ),
    };

    const code = generatePipelineCode(withParams);
    expect(code).toContain('params = {');
    expect(code).toContain('"country": "US"');
    expect(code).toContain("params['country']");
  });
});
