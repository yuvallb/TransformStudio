import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/data/db';
import {
  buildDatasetsMapForWorkflow,
  datasetRecordToNodeDataset,
  deleteOrphanedDatasets,
  loadDatasetsForWorkflow,
  saveDataset,
} from '@/data/dataset-repo';
import { deleteWorkflow, getMostRecentWorkflow, loadWorkflow, saveWorkflow } from '@/data/workflow-repo';
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
  ],
  edges: [],
  params: [{ name: 'country', type: 'string', default: 'US' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('workflow-repo', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('saves and loads a workflow round-trip', async () => {
    const workflow = sampleWorkflow();
    await saveWorkflow(workflow);

    const loaded = await loadWorkflow('wf-1');
    expect(loaded).toMatchObject({
      id: workflow.id,
      name: workflow.name,
      nodes: workflow.nodes,
      edges: workflow.edges,
      params: workflow.params,
      schemaVersion: workflow.schemaVersion,
    });
  });

  it('returns the most recently updated workflow', async () => {
    const older = sampleWorkflow();
    const newer = {
      ...sampleWorkflow(),
      id: 'wf-2',
      name: 'Newer',
      updatedAt: '2026-02-01T00:00:00.000Z',
    };

    await saveWorkflow(older);
    await saveWorkflow(newer);

    const recent = await getMostRecentWorkflow();
    expect(recent?.id).toBe('wf-2');
  });

  it('deletes a workflow', async () => {
    await saveWorkflow(sampleWorkflow());
    await deleteWorkflow('wf-1');
    expect(await loadWorkflow('wf-1')).toBeNull();
  });
});

describe('dataset-repo', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('saves and loads datasets for a workflow', async () => {
    const bytes = new TextEncoder().encode('a,b\n1,2');
    await saveDataset('wf-1', 'n1', {
      nodeId: 'n1',
      filename: 'data.csv',
      data: bytes,
    });

    const records = await loadDatasetsForWorkflow('wf-1');
    expect(records).toHaveLength(1);
    expect(records[0]?.filename).toBe('data.csv');

    const restored = datasetRecordToNodeDataset(records[0]!);
    expect(new TextDecoder().decode(restored.data)).toBe('a,b\n1,2');
  });

  it('buildDatasetsMapForWorkflow ignores orphaned dataset records', () => {
    const workflow = sampleWorkflow();
    const records = [
      {
        id: 'd1',
        workflowId: 'wf-1',
        nodeId: 'n1',
        filename: 'data.csv',
        mimeType: 'text/csv',
        data: new ArrayBuffer(0),
        importedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'd2',
        workflowId: 'wf-1',
        nodeId: 'deleted-node',
        filename: 'old.csv',
        mimeType: 'text/csv',
        data: new ArrayBuffer(0),
        importedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const map = buildDatasetsMapForWorkflow(workflow, records);
    expect(Object.keys(map)).toEqual(['n1']);
  });

  it('deleteOrphanedDatasets removes records for missing nodes', async () => {
    const workflow = sampleWorkflow();
    await saveDataset('wf-1', 'n1', {
      nodeId: 'n1',
      filename: 'data.csv',
      data: new TextEncoder().encode('a,b'),
    });
    await saveDataset('wf-1', 'orphan', {
      nodeId: 'orphan',
      filename: 'old.csv',
      data: new TextEncoder().encode('x,y'),
    });

    await deleteOrphanedDatasets('wf-1', workflow);

    const records = await loadDatasetsForWorkflow('wf-1');
    expect(records.map((r) => r.nodeId)).toEqual(['n1']);
  });
});
