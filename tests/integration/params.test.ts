import { beforeEach, describe, expect, it } from 'vitest';

import { KernelClient } from '@/engine/kernel-client';
import { filter } from '@/nodes/filter';
import { sourceCsv } from '@/nodes/source-csv';

const SALES_CSV = `region,country,revenue
North,US,1500
South,UK,800
East,US,2200
West,CA,500
North,DE,3200
South,US,900`;

describe('params integration', () => {
  let client: KernelClient;
  const bytes = new TextEncoder().encode(SALES_CSV);

  beforeEach(() => {
    client = new KernelClient();
  });

  it('filters by param override value', async () => {
    const sourceCode = sourceCsv.compile(
      { filename: 'sales.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_src',
      {},
      { mode: 'execution' },
    );
    const filterCode = filter.compile(
      { expression: 'df["country"] == {country}' },
      ['node_src'],
      'node_flt',
      { country: 'US' },
    );

    const usResult = await client.executePipeline({
      params: { country: 'US' },
      nodes: [
        { nodeId: 'src', code: sourceCode, isStale: true, csvBytes: bytes },
        { nodeId: 'flt', code: filterCode, isStale: true },
      ],
    });

    expect(usResult.nodeResults.flt?.status).toBe('success');
    const usRows = usResult.nodeResults.flt?.preview?.totalRows ?? 0;

    const ukFilterCode = filter.compile(
      { expression: 'df["country"] == {country}' },
      ['node_src'],
      'node_flt',
      { country: 'UK' },
    );

    const ukResult = await client.executePipeline({
      params: { country: 'UK' },
      nodes: [
        { nodeId: 'src', code: sourceCode, isStale: true, csvBytes: bytes },
        { nodeId: 'flt', code: ukFilterCode, isStale: true },
      ],
    });

    expect(ukResult.nodeResults.flt?.status).toBe('success');
    const ukRows = ukResult.nodeResults.flt?.preview?.totalRows ?? 0;

    expect(usRows).toBe(3);
    expect(ukRows).toBe(1);
    expect(usRows).not.toBe(ukRows);
  });
});
