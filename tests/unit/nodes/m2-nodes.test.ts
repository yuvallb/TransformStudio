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

  it('compiles bracket notation with eval', () => {
    const code = filter.compile(
      { expression: 'df["revenue"] > 1000' },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe('node_b = node_a[node_a.eval("node_a[\\"revenue\\"] > 1000")]');
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

  it('uses named aggregation when grouping and aggregating the same column', () => {
    const code = groupby.compile(
      {
        groupColumns: ['customer_id'],
        aggregations: [{ column: 'customer_id', func: 'count' }],
      },
      ['node_a'],
      'node_b',
      {},
    );
    expect(code).toBe(
      'node_b = node_a.groupby(["customer_id"]).agg(customer_id_count=("customer_id", "count")).reset_index()',
    );
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
