import { beforeEach, describe, expect, it } from 'vitest';

import { KernelClient } from '@/engine/kernel-client';
import { concat } from '@/nodes/concat';
import { join } from '@/nodes/join';
import { sourceCsv } from '@/nodes/source-csv';

const CUSTOMERS_CSV = `customer_id,name,country
1,Alice,US
2,Bob,UK
3,Carol,CA`;

const ORDERS_CSV = `order_id,customer_id,amount
101,1,150.00
102,2,89.50
103,1,220.00`;

describe('join integration', () => {
  let client: KernelClient;

  beforeEach(() => {
    client = new KernelClient();
  });

  it('joins customers and orders on customer_id', async () => {
    const customersCode = sourceCsv.compile(
      { filename: 'customers.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_cust',
      {},
      { mode: 'execution' },
    );
    const ordersCode = sourceCsv.compile(
      { filename: 'orders.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_ord',
      {},
      { mode: 'execution' },
    );
    const joinCode = join.compile(
      { leftOn: 'customer_id', rightOn: 'customer_id', how: 'inner' },
      ['node_cust', 'node_ord'],
      'node_join',
      {},
    );

    const result = await client.executePipeline({
      params: {},
      nodes: [
        {
          nodeId: 'cust',
          code: customersCode,
          isStale: true,
          csvBytes: new TextEncoder().encode(CUSTOMERS_CSV),
        },
        {
          nodeId: 'ord',
          code: ordersCode,
          isStale: true,
          csvBytes: new TextEncoder().encode(ORDERS_CSV),
        },
        { nodeId: 'join', code: joinCode, isStale: true },
      ],
    });

    expect(result.error).toBeUndefined();
    expect(result.nodeResults.join?.status).toBe('success');
    const preview = result.nodeResults.join?.preview;
    expect(preview?.totalColumns).toBe(5);
    expect(preview?.totalRows).toBe(3);
  });

  it('concatenates row-wise', async () => {
    const sourceCode = sourceCsv.compile(
      { filename: 'a.csv', delimiter: ',', header: true, encoding: 'utf-8' },
      [],
      'node_a',
      {},
      { mode: 'execution' },
    );
    const concatCode = concat.compile({ axis: 0 }, ['node_a', 'node_b'], 'node_c', {});

    const csv = `x,y\n1,2\n3,4`;
    const result = await client.executePipeline({
      params: {},
      nodes: [
        { nodeId: 'a', code: sourceCode, isStale: true, csvBytes: new TextEncoder().encode(csv) },
        { nodeId: 'b', code: sourceCode.replace('node_a', 'node_b'), isStale: true, csvBytes: new TextEncoder().encode(csv) },
        { nodeId: 'c', code: concatCode, isStale: true },
      ],
    });

    expect(result.error).toBeUndefined();
    expect(result.nodeResults.c?.preview?.totalRows).toBe(4);
    expect(result.nodeResults.c?.preview?.totalColumns).toBe(2);
  });
});

describe('expression validation integration', () => {
  let client: KernelClient;

  beforeEach(() => {
    client = new KernelClient();
  });

  it('rejects __import__', async () => {
    const result = await client.validateExpression("__import__('os')");
    expect(result.valid).toBe(false);
  });

  it('rejects exec', async () => {
    const result = await client.validateExpression("exec('print(1)')");
    expect(result.valid).toBe(false);
  });

  it('accepts safe comparisons', async () => {
    const result = await client.validateExpression('revenue > 1000');
    expect(result.valid).toBe(true);
  });

  it('accepts param references', async () => {
    const result = await client.validateExpression('df["country"] == {country}');
    expect(result.valid).toBe(true);
  });
});
