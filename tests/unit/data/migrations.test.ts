import { describe, expect, it } from 'vitest';

import { migrateWorkflow } from '@/data/migrations';
import { WORKFLOW_SCHEMA_VERSION } from '@/lib/constants';
import type { Workflow } from '@/lib/types';

const sampleWorkflow = (): Workflow => ({
  id: 'wf-1',
  name: 'Test Pipeline',
  schemaVersion: 1,
  nodes: [
    {
      id: 'n1',
      type: 'source.csv',
      position: { x: 0, y: 0 },
      config: { filename: 'data.csv' },
    },
    {
      id: 'n2',
      type: 'filter',
      position: { x: 200, y: 0 },
      config: { expression: 'revenue > 0' },
    },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
  params: [{ name: 'country', type: 'string', default: 'US' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('migrateWorkflow', () => {
  it('returns workflow unchanged at current schema version', () => {
    const workflow = sampleWorkflow();
    const migrated = migrateWorkflow(workflow);

    expect(migrated).toEqual(workflow);
    expect(migrated.schemaVersion).toBe(WORKFLOW_SCHEMA_VERSION);
  });

  it('preserves all workflow fields on round-trip', () => {
    const workflow = sampleWorkflow();
    const migrated = migrateWorkflow(structuredClone(workflow));

    expect(migrated.id).toBe(workflow.id);
    expect(migrated.name).toBe(workflow.name);
    expect(migrated.nodes).toEqual(workflow.nodes);
    expect(migrated.edges).toEqual(workflow.edges);
    expect(migrated.params).toEqual(workflow.params);
    expect(migrated.createdAt).toBe(workflow.createdAt);
    expect(migrated.updatedAt).toBe(workflow.updatedAt);
  });
});
