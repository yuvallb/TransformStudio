import { beforeEach, describe, expect, it } from 'vitest';

import { KernelClient } from '@/engine/kernel-client';
import { filter } from '@/nodes/filter';
import { groupby } from '@/nodes/groupby';
import { sourceCsv } from '@/nodes/source-csv';

const SALES_CSV = `region,country,revenue,order_id,status
North,US,1500,ORD-0001,completed
South,UK,800,ORD-0002,pending
East,US,2200,ORD-0003,completed
West,CA,500,ORD-0004,pending`;

describe('memory eviction integration', () => {
  let client: KernelClient;
  const bytes = new TextEncoder().encode(SALES_CSV);

  beforeEach(() => {
    client = new KernelClient();
  });

  /**
   * When a node is deleted from the graph, the main thread sends its ID via
   * `deleteNodeIds` on the next executePipeline call. The worker runs:
   *   del globals()["node_<id>"]; gc.collect()
   * This test verifies that eviction completes without error after a successful
   * pipeline run. We cannot assert memory usage in CI, but a failed del/gc
   * would surface as a structured pipeline error.
   */
  it('evicts deleted node vars without error', async () => {
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

    const initial = await client.executePipeline({
      params: {},
      nodes: [
        { nodeId: 'src', code: sourceCode, isStale: true, csvBytes: bytes },
        { nodeId: 'flt', code: filterCode, isStale: true },
        { nodeId: 'grp', code: groupCode, isStale: true },
      ],
    });

    expect(initial.error).toBeUndefined();
    expect(initial.nodeResults.grp?.status).toBe('success');

    // Simulate deleting the filter node: worker should drop node_flt from globals.
    const eviction = await client.executePipeline({
      params: {},
      nodes: [],
      deleteNodeIds: ['flt'],
    });

    expect(eviction.error).toBeUndefined();
    expect(Object.keys(eviction.nodeResults)).toHaveLength(0);
  });

  it('evicts multiple deleted nodes in one request', async () => {
    const sourceCode = sourceCsv.compile(
      { filename: 'sales.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_src',
      {},
      { mode: 'execution' },
    );
    const filterCode = filter.compile(
      { expression: 'revenue > 500' },
      ['node_src'],
      'node_flt',
      {},
    );

    await client.executePipeline({
      params: {},
      nodes: [
        { nodeId: 'src', code: sourceCode, isStale: true, csvBytes: bytes },
        { nodeId: 'flt', code: filterCode, isStale: true },
      ],
    });

    const eviction = await client.executePipeline({
      params: {},
      nodes: [],
      deleteNodeIds: ['src', 'flt'],
    });

    expect(eviction.error).toBeUndefined();
  });
});
