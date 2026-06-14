import { describe, expect, it } from 'vitest';

import { compileNodeExportCode, generatePipelineCode } from '@/engine/codegen';
import { generateNotebook } from '@/export/notebook';
import type { Workflow } from '@/lib/types';

const workflow: Workflow = {
  id: 'wf1',
  name: 'Sales pipeline',
  schemaVersion: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-06-14T12:00:00Z',
  params: [],
  nodes: [
    {
      id: 'src',
      type: 'source.csv',
      position: { x: 0, y: 0 },
      config: { filename: 'sales.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      title: 'Load sales',
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

describe('generateNotebook', () => {
  it('produces valid nbformat v4 structure', () => {
    const nb = generateNotebook(workflow);

    expect(nb.nbformat).toBe(4);
    expect(nb.nbformat_minor).toBe(5);
    expect(nb.metadata.kernelspec.name).toBe('python3');
    expect(nb.metadata.language_info.name).toBe('python');
  });

  it('includes setup cell plus alternating markdown and code per node', () => {
    const nb = generateNotebook(workflow);

    expect(nb.cells[0].cell_type).toBe('code');
    expect(nb.cells[0].source.join('')).toContain('import pandas as pd');
    expect(nb.cells[0].source.join('')).toContain('copy_on_write');

    const markdownCells = nb.cells.filter((c) => c.cell_type === 'markdown');
    const codeCells = nb.cells.filter((c) => c.cell_type === 'code');

    expect(markdownCells).toHaveLength(workflow.nodes.length);
    expect(codeCells).toHaveLength(workflow.nodes.length + 1);
    expect(nb.cells).toHaveLength(1 + workflow.nodes.length * 2);
  });

  it('markdown cells include node labels and ids', () => {
    const nb = generateNotebook(workflow);
    const markdown = nb.cells
      .filter((c) => c.cell_type === 'markdown')
      .map((c) => c.source.join(''))
      .join('\n');

    expect(markdown).toContain('## CSV Source: Load sales');
    expect(markdown).toContain('`src`');
    expect(markdown).toContain('## Filter');
    expect(markdown).toContain('## GroupBy');
    expect(markdown).toContain('Provide the data file');
  });

  it('code cells match pipeline compile output', () => {
    const nb = generateNotebook(workflow);
    const pipelineCode = generatePipelineCode(workflow);
    const nodeCodeCells = nb.cells
      .filter((c) => c.cell_type === 'code')
      .slice(1)
      .map((c) => c.source.join('').trimEnd());

    for (const node of workflow.nodes) {
      const compiled = compileNodeExportCode(node, workflow);
      expect(nodeCodeCells.some((source) => source.includes(compiled))).toBe(true);
      expect(pipelineCode).toContain(compiled);
    }
  });

  it('includes params in setup cell when workflow has parameters', () => {
    const withParams: Workflow = {
      ...workflow,
      params: [{ name: 'min_revenue', type: 'number', default: 1000 }],
    };

    const nb = generateNotebook(withParams);
    expect(nb.cells[0].source.join('')).toContain('params = {');
    expect(nb.cells[0].source.join('')).toContain('"min_revenue": 1000');
  });

  it('formats source lines with trailing newlines', () => {
    const nb = generateNotebook(workflow);
    for (const cell of nb.cells) {
      for (const line of cell.source) {
        expect(line.endsWith('\n')).toBe(true);
      }
    }
  });
});
