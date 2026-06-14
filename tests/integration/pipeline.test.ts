import { beforeEach, describe, expect, it } from 'vitest';

import { KernelClient } from '@/engine/kernel-client';
import { filter } from '@/nodes/filter';
import { groupby } from '@/nodes/groupby';
import { sourceCsv } from '@/nodes/source-csv';

const SALES_CSV = `region,country,revenue,order_id,status
North,US,1500,ORD-0001,completed
South,UK,800,ORD-0002,pending
East,US,2200,ORD-0003,completed
West,CA,500,ORD-0004,pending
North,DE,3200,ORD-0005,completed
South,US,900,ORD-0006,pending
East,UK,1100,ORD-0007,completed
West,US,450,ORD-0008,pending`;

describe('pipeline integration', () => {
  let client: KernelClient;
  const bytes = new TextEncoder().encode(SALES_CSV);

  beforeEach(() => {
    client = new KernelClient();
  });

  it('executes source → filter → groupby pipeline', async () => {
    const sourceCode = sourceCsv.compile(
      { filename: 'sales.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_src',
      {},
      { mode: 'execution' },
    );
    const filterCode = filter.compile(
      { expression: 'revenue > 1000' },
      ['node_src'],
      'node_flt',
      {},
    );
    const groupCode = groupby.compile(
      {
        groupColumns: ['region'],
        aggregations: [{ column: 'revenue', func: 'sum' }],
      },
      ['node_flt'],
      'node_grp',
      {},
    );

    const result = await client.executePipeline({
      params: {},
      nodes: [
        { nodeId: 'src', code: sourceCode, isStale: true, csvBytes: bytes },
        { nodeId: 'flt', code: filterCode, isStale: true },
        { nodeId: 'grp', code: groupCode, isStale: true },
      ],
    });

    expect(result.error).toBeUndefined();
    expect(result.nodeResults.src?.status).toBe('success');
    expect(result.nodeResults.flt?.status).toBe('success');
    expect(result.nodeResults.grp?.status).toBe('success');

    const sourceRows = result.nodeResults.src?.preview?.totalRows ?? 0;
    const filterRows = result.nodeResults.flt?.preview?.totalRows ?? 0;
    expect(filterRows).toBeLessThan(sourceRows);
    expect(result.nodeResults.grp?.preview?.totalColumns).toBeGreaterThan(0);
  });

  it('skips unchanged source on incremental recompute', async () => {
    const sourceCode = sourceCsv.compile(
      { filename: 'sales.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_src',
      {},
      { mode: 'execution' },
    );
    const filterCodeV1 = filter.compile(
      { expression: 'revenue > 1000' },
      ['node_src'],
      'node_flt',
      {},
    );
    const filterCodeV2 = filter.compile(
      { expression: 'revenue > 2000' },
      ['node_src'],
      'node_flt',
      {},
    );
    const groupCode = groupby.compile(
      {
        groupColumns: ['region'],
        aggregations: [{ column: 'revenue', func: 'sum' }],
      },
      ['node_flt'],
      'node_grp',
      {},
    );

    const first = await client.executePipeline({
      params: {},
      nodes: [
        { nodeId: 'src', code: sourceCode, isStale: true, csvBytes: bytes },
        { nodeId: 'flt', code: filterCodeV1, isStale: true },
        { nodeId: 'grp', code: groupCode, isStale: true },
      ],
    });

    const sourceFingerprint = first.nodeResults.src?.preview?.totalRows;

    const second = await client.executePipeline({
      params: {},
      nodes: [
        { nodeId: 'flt', code: filterCodeV2, isStale: true },
        { nodeId: 'grp', code: groupCode, isStale: true },
      ],
    });

    expect(second.nodeResults.src).toBeUndefined();
    expect(second.nodeResults.flt?.status).toBe('success');
    expect(second.nodeResults.grp?.status).toBe('success');
    expect(second.nodeResults.flt?.preview?.totalRows).toBeLessThan(
      first.nodeResults.flt?.preview?.totalRows ?? 0,
    );
    expect(sourceFingerprint).toBe(8);
  });
});
