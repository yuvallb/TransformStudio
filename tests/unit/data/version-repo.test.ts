import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/data/db';
import {
  createVersion,
  deleteVersionsForWorkflow,
  getLatestVersion,
  getVersion,
  listVersions,
} from '@/data/version-repo';
import { saveWorkflow } from '@/data/workflow-repo';
import type { Workflow } from '@/lib/types';
import { createSnapshot } from '@/versioning/snapshot';

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
  params: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('version-repo', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('creates and retrieves a version snapshot', async () => {
    const workflow = sampleWorkflow();
    await saveWorkflow(workflow);

    const snapshot = await createSnapshot(workflow, 'Initial save');
    const loaded = await getVersion(snapshot.id);

    expect(loaded).toMatchObject({
      id: snapshot.id,
      workflowId: 'wf-1',
      message: 'Initial save',
      parentId: null,
    });
    expect(loaded?.workflow.nodes).toEqual(workflow.nodes);
  });

  it('lists versions newest-first for a workflow', async () => {
    const workflow = sampleWorkflow();
    await saveWorkflow(workflow);

    const first = await createSnapshot(workflow, 'First');
    await createSnapshot(workflow, 'Second', first.id);

    const versions = await listVersions('wf-1');
    expect(versions).toHaveLength(2);
    expect(versions[0]?.message).toBe('Second');
    expect(versions[1]?.message).toBe('First');
    expect(versions[0]?.parentId).toBe(first.id);
  });

  it('returns the latest version', async () => {
    const workflow = sampleWorkflow();
    await saveWorkflow(workflow);

    await createSnapshot(workflow, 'First');
    const latest = await createSnapshot(workflow, 'Latest');

    const result = await getLatestVersion('wf-1');
    expect(result?.id).toBe(latest.id);
    expect(result?.message).toBe('Latest');
  });

  it('deletes all versions for a workflow', async () => {
    const workflow = sampleWorkflow();
    await saveWorkflow(workflow);

    const snapshot = await createSnapshot(workflow, 'To delete');
    await deleteVersionsForWorkflow('wf-1');

    expect(await getVersion(snapshot.id)).toBeNull();
    expect(await listVersions('wf-1')).toHaveLength(0);
  });

  it('createVersion stores a snapshot directly', async () => {
    const workflow = sampleWorkflow();
    const snapshot = {
      id: 'snap-direct',
      workflowId: workflow.id,
      parentId: null,
      message: 'Direct put',
      workflow,
      createdAt: '2026-01-02T00:00:00.000Z',
    };

    await createVersion(snapshot);

    const loaded = await getVersion('snap-direct');
    expect(loaded?.message).toBe('Direct put');
  });
});
