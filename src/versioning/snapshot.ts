import { getLatestVersion, createVersion, getVersion } from '@/data/version-repo';
import { saveWorkflow } from '@/data/workflow-repo';
import { WORKFLOW_SCHEMA_VERSION } from '@/lib/constants';
import type { VersionSnapshot, Workflow } from '@/lib/types';
import { createId } from '@/lib/utils';

function cloneWorkflow(workflow: Workflow): Workflow {
  return structuredClone(workflow);
}

function nextCreatedAt(latestCreatedAt: string | null): string {
  const now = new Date().toISOString();
  if (!latestCreatedAt || latestCreatedAt < now) {
    return now;
  }
  return new Date(new Date(latestCreatedAt).getTime() + 1).toISOString();
}

export async function createSnapshot(
  workflow: Workflow,
  message: string,
  parentId: string | null = null,
): Promise<VersionSnapshot> {
  const latest = await getLatestVersion(workflow.id);
  const resolvedParent = parentId ?? latest?.id ?? null;

  const snapshot: VersionSnapshot = {
    id: createId(),
    workflowId: workflow.id,
    parentId: resolvedParent,
    message,
    workflow: cloneWorkflow(workflow),
    createdAt: nextCreatedAt(latest?.createdAt ?? null),
  };

  await createVersion(snapshot);
  return snapshot;
}

export async function revertToSnapshot(
  snapshotId: string,
  currentWorkflow: Workflow,
): Promise<Workflow> {
  const snapshot = await getVersion(snapshotId);
  if (!snapshot) {
    throw new Error('Version snapshot not found');
  }

  await createSnapshot(currentWorkflow, 'Auto-save before revert');

  const restored = cloneWorkflow(snapshot.workflow);
  restored.updatedAt = new Date().toISOString();
  await saveWorkflow(restored);

  return restored;
}

export async function forkFromSnapshot(snapshotId: string): Promise<Workflow> {
  const snapshot = await getVersion(snapshotId);
  if (!snapshot) {
    throw new Error('Version snapshot not found');
  }

  const now = new Date().toISOString();
  const forked: Workflow = {
    ...cloneWorkflow(snapshot.workflow),
    id: createId(),
    name: `${snapshot.workflow.name} (fork)`,
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
  };

  await saveWorkflow(forked);
  await createSnapshot(forked, `Forked from "${snapshot.message}"`, null);

  return forked;
}
