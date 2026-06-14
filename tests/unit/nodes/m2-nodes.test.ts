import { describe, expect, it } from 'vitest';

import { filter } from '@/nodes/filter';
import { groupby } from '@/nodes/groupby';
import { output } from '@/nodes/output';
import { sourceCsv } from '@/nodes/source-csv';
import { isExpressionSafe } from '@/nodes/filter';

describe('source.csv', () => {
  it('validates missing filename', () => {
    expect(sourceCsv.validate({}, [])).toHaveLength(1);
  });

  it('compiles read_csv for execution', () => {
    const code = sourceCsv.compile(
      { filename: 'data.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_abc',
      {},
      { mode: 'execution' },
    );
    expect(code).toContain("pd.read_csv('/tmp/node_abc.csv'");
  });

  it('compiles read_csv for export', () => {
    const code = sourceCsv.compile(
      { filename: 'data.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_abc',
      {},
      { mode: 'export' },
    );
    expect(code).toContain('pd.read_csv("data.csv"');
  });
});

describe('filter', () => {
  it('rejects unsafe expressions', () => {
    expect(isExpressionSafe('import os')).toBe(false);
    expect(isExpressionSafe('revenue > 1000')).toBe(true);
  });

  it('compiles simple expression with eval', () => {
    const code = filter.compile({ expression: 'revenue > 1000' }, ['node_a'], 'node_b', {});
    expect(code).toBe('node_b = node_a[node_a.eval("revenue > 1000")]');
  });

  it('requires expression', () => {
    expect(filter.validate({ expression: '' }, [[]])).toHaveLength(1);
  });
});

describe('groupby', () => {
  it('compiles groupby agg', () => {
    const code = groupby.compile(
      {
        groupColumns: ['region'],
        aggregations: [{ column: 'revenue', func: 'sum' }],
      },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toContain('groupby');
    expect(code).toContain('reset_index');
  });

  it('validates missing group columns', () => {
    expect(groupby.validate({ groupColumns: [], aggregations: [] }, [[]])).not.toHaveLength(0);
  });
});

describe('output', () => {
  it('passes through in execution mode', () => {
    const code = output.compile(
      { format: 'csv', filename: 'out.csv' },
      ['node_a'],
      'node_b',
      {},
      { mode: 'execution' },
    );
    expect(code).toBe('node_b = node_a');
  });

  it('includes to_csv in export mode', () => {
    const code = output.compile(
      { format: 'csv', filename: 'out.csv' },
      ['node_a'],
      'node_b',
      {},
      { mode: 'export' },
    );
    expect(code).toContain('to_csv');
  });
});
