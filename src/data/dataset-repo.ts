import { db } from '@/data/db';
import type { DatasetRecord, NodeDataset, Workflow } from '@/lib/types';
import { createId } from '@/lib/utils';

export async function saveDataset(
  workflowId: string,
  nodeId: string,
  dataset: NodeDataset,
  mimeType = 'application/octet-stream',
): Promise<DatasetRecord> {
  const existing = await db.datasets
    .where('[workflowId+nodeId]')
    .equals([workflowId, nodeId])
    .first();

  const record: DatasetRecord = {
    id: existing?.id ?? createId(),
    workflowId,
    nodeId,
    filename: dataset.filename,
    mimeType,
    data: dataset.data.buffer.slice(
      dataset.data.byteOffset,
      dataset.data.byteOffset + dataset.data.byteLength,
    ) as ArrayBuffer,
    importedAt: existing?.importedAt ?? new Date().toISOString(),
  };

  await db.datasets.put(record);
  return record;
}

export async function loadDatasetsForWorkflow(workflowId: string): Promise<DatasetRecord[]> {
  return db.datasets.where('workflowId').equals(workflowId).toArray();
}

export async function deleteDatasetForNode(workflowId: string, nodeId: string): Promise<void> {
  const record = await db.datasets
    .where('[workflowId+nodeId]')
    .equals([workflowId, nodeId])
    .first();
  if (record) {
    await db.datasets.delete(record.id);
  }
}

export async function deleteDatasetsForWorkflow(workflowId: string): Promise<void> {
  await db.datasets.where('workflowId').equals(workflowId).delete();
}

export function datasetRecordToNodeDataset(record: DatasetRecord): NodeDataset {
  return {
    nodeId: record.nodeId,
    filename: record.filename,
    data: new Uint8Array(record.data),
  };
}

export function buildDatasetsMapForWorkflow(
  workflow: Workflow,
  records: DatasetRecord[],
): Record<string, NodeDataset> {
  const nodeIds = new Set(workflow.nodes.map((n) => n.id));
  return Object.fromEntries(
    records
      .filter((r) => nodeIds.has(r.nodeId))
      .map((r) => [r.nodeId, datasetRecordToNodeDataset(r)]),
  );
}

export async function deleteOrphanedDatasets(workflowId: string, workflow: Workflow): Promise<void> {
  const nodeIds = new Set(workflow.nodes.map((n) => n.id));
  const records = await loadDatasetsForWorkflow(workflowId);
  const orphanIds = records.filter((r) => !nodeIds.has(r.nodeId)).map((r) => r.id);
  if (orphanIds.length > 0) {
    await db.datasets.bulkDelete(orphanIds);
  }
}

export async function copyDatasetsToWorkflow(
  sourceWorkflowId: string,
  targetWorkflowId: string,
  nodeIdMap: Map<string, string>,
): Promise<Record<string, NodeDataset>> {
  const sourceRecords = await loadDatasetsForWorkflow(sourceWorkflowId);
  const datasets: Record<string, NodeDataset> = {};

  for (const record of sourceRecords) {
    const newNodeId = nodeIdMap.get(record.nodeId);
    if (!newNodeId) continue;

    const nodeDataset = datasetRecordToNodeDataset(record);
    datasets[newNodeId] = nodeDataset;
    await saveDataset(targetWorkflowId, newNodeId, nodeDataset, record.mimeType);
  }

  return datasets;
}
