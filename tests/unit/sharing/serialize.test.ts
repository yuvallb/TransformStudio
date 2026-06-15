import { describe, expect, it } from 'vitest';

import type { Workflow } from '@/lib/types';
import { deserializeWorkflow, serializeWorkflow } from '@/sharing/serialize';

const sampleWorkflow = (): Workflow => ({
  id: 'wf-local',
  name: 'Revenue Pipeline',
  schemaVersion: 1,
  nodes: [
    {
      id: 'src-1',
      type: 'source.csv',
      position: { x: 0, y: 0 },
      config: { filename: 'sales.csv', delimiter: ',', header: true, encoding: 'utf-8' },
    },
    {
      id: 'flt-1',
      type: 'filter',
      position: { x: 200, y: 0 },
      config: { expression: 'amount > 100' },
    },
  ],
  edges: [{ id: 'e1', source: 'src-1', target: 'flt-1' }],
  params: [{ name: 'min_amount', type: 'number', default: 100, label: 'Minimum amount' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
});

describe('serializeWorkflow', () => {
  it('round-trips graph structure and params without local metadata', () => {
    const json = serializeWorkflow(sampleWorkflow());
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed).not.toHaveProperty('id');
    expect(parsed).not.toHaveProperty('createdAt');
    expect(parsed).not.toHaveProperty('updatedAt');
    expect(parsed).not.toHaveProperty('datasets');
    expect(parsed.name).toBe('Revenue Pipeline');
    expect(parsed.params).toHaveLength(1);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.edges).toHaveLength(1);

    const restored = deserializeWorkflow(json);
    expect(restored.id).not.toBe('wf-local');
    expect(restored.name).toBe('Revenue Pipeline');
    expect(restored.nodes).toHaveLength(2);
    expect(restored.edges).toHaveLength(1);
    expect(restored.nodes.every((n) => /^[a-f0-9]{8}$/.test(n.id))).toBe(true);
    expect(restored.edges.every((e) => restored.nodes.some((n) => n.id === e.source))).toBe(
      true,
    );
    expect(restored.edges.every((e) => restored.nodes.some((n) => n.id === e.target))).toBe(
      true,
    );
    expect(restored.params[0]?.name).toBe('min_amount');
    expect(restored.createdAt).toBeTruthy();
    expect(restored.updatedAt).toBeTruthy();
  });

  it('strips source filenames and excludes dataset bytes', () => {
    const json = serializeWorkflow(sampleWorkflow());

    expect(json).not.toMatch(/ArrayBuffer/);
    expect(json).not.toContain('sales.csv');

    const source = (JSON.parse(json) as Workflow).nodes.find((n) => n.type === 'source.csv');
    expect(source?.config.filename).toBe('');
  });

  it('rejects unsupported future schema versions', () => {
    const payload = {
      schemaVersion: 99,
      name: 'Future',
      nodes: [],
      edges: [],
      params: [],
    };

    expect(() => deserializeWorkflow(JSON.stringify(payload))).toThrow(/Unsupported workflow version/);
  });

  it('rejects unknown node types', () => {
    const payload = {
      schemaVersion: 1,
      name: 'Malicious',
      nodes: [{ id: 'n1', type: 'evil.node', position: { x: 0, y: 0 }, config: {} }],
      edges: [],
      params: [],
    };

    expect(() => deserializeWorkflow(JSON.stringify(payload))).toThrow(/unknown node type/);
  });

  it('rejects malicious node ids on import to prevent code injection', () => {
    const payload = {
      schemaVersion: 1,
      name: 'Injected',
      nodes: [
        {
          id: 'x\nimport os\n#',
          type: 'filter',
          position: { x: 0, y: 0 },
          config: { expression: 'revenue > 0' },
        },
      ],
      edges: [],
      params: [],
    };

    expect(() => deserializeWorkflow(JSON.stringify(payload))).toThrow(/must match/);
  });

  it('rejects duplicate node ids on import', () => {
    const payload = {
      schemaVersion: 1,
      name: 'Duplicate',
      nodes: [
        { id: 'dup', type: 'filter', position: { x: 0, y: 0 }, config: { expression: 'x > 0' } },
        { id: 'dup', type: 'output', position: { x: 100, y: 0 }, config: {} },
      ],
      edges: [],
      params: [],
    };

    expect(() => deserializeWorkflow(JSON.stringify(payload))).toThrow(/duplicate node id/);
  });
});
