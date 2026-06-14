import { getNodeDefinition } from '@/nodes/registry';

import type {
  ExecutePipelineRequest,
  NodeDataset,
  NodeRuntimeState,
  Workflow,
  WorkflowNode,
} from '@/lib/types';
import { paramsToRecord } from '@/lib/utils';

import { computeDatasetFingerprint, computeFingerprint } from './fingerprint';
import { getInputVars, topoSort } from './topo-sort';

export interface BuildPipelineOptions {
  workflow: Workflow;
  staleNodeIds: Set<string>;
  runtimeByNode: Map<string, NodeRuntimeState>;
  datasets: Record<string, NodeDataset>;
}

export async function buildPipelineRequest(
  options: BuildPipelineOptions,
): Promise<ExecutePipelineRequest> {
  const { workflow, staleNodeIds, runtimeByNode, datasets } = options;
  const sorted = topoSort(workflow.nodes, workflow.edges);
  const paramRecord = paramsToRecord(workflow.params);
  const nodes: ExecutePipelineRequest['nodes'] = [];

  for (const node of sorted) {
    const def = getNodeDefinition(node.type);
    const inputVars = getInputVars(node.id, workflow.edges);
    const outputVar = `node_${node.id}`;
    const isStale = staleNodeIds.has(node.id);
    const dataset = datasets[node.id];

    let datasetFingerprint: string | null = null;
    if (dataset) {
      datasetFingerprint = await computeDatasetFingerprint(dataset.data);
    }

    const upstreamFingerprints = getInputVars(node.id, workflow.edges).map((varName) => {
      const upstreamId = varName.replace('node_', '');
      return runtimeByNode.get(upstreamId)?.fingerprint ?? '';
    });

    const fingerprint = await computeFingerprint(
      node,
      paramRecord,
      upstreamFingerprints,
      datasetFingerprint,
    );

    const cached = runtimeByNode.get(node.id);
    const needsRun = isStale || cached?.fingerprint !== fingerprint;

    if (!needsRun) continue;

    const code = def.compile(node.config, inputVars, outputVar, paramRecord, {
      mode: 'execution',
    });

    const entry: ExecutePipelineRequest['nodes'][number] = {
      nodeId: node.id,
      code,
      isStale: true,
    };

    if (node.type === 'source.csv' && dataset) {
      entry.csvBytes = dataset.data;
      entry.csvOptions = {
        delimiter: typeof node.config.delimiter === 'string' ? node.config.delimiter : ',',
        header: node.config.header !== false,
        encoding: typeof node.config.encoding === 'string' ? node.config.encoding : 'utf-8',
      };
    }

    nodes.push(entry);
  }

  return { nodes, params: paramRecord };
}

export async function updateRuntimeFingerprints(
  workflow: Workflow,
  runtimeByNode: Map<string, NodeRuntimeState>,
  datasets: Record<string, NodeDataset>,
  executedNodeIds: string[],
): Promise<Map<string, NodeRuntimeState>> {
  const next = new Map(runtimeByNode);
  const paramRecord = paramsToRecord(workflow.params);

  for (const nodeId of executedNodeIds) {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const dataset = datasets[node.id];
    let datasetFingerprint: string | null = null;
    if (dataset) {
      datasetFingerprint = await computeDatasetFingerprint(dataset.data);
    }

    const upstreamFingerprints = getInputVars(node.id, workflow.edges).map((varName) => {
      const upstreamId = varName.replace('node_', '');
      return next.get(upstreamId)?.fingerprint ?? '';
    });

    const fingerprint = await computeFingerprint(
      node,
      paramRecord,
      upstreamFingerprints,
      datasetFingerprint,
    );

    const existing = next.get(nodeId);
    if (existing) {
      next.set(nodeId, { ...existing, fingerprint });
    }
  }

  return next;
}

export function getUpstreamSchemas(
  node: WorkflowNode,
  workflow: Workflow,
  runtimeByNode: Map<string, NodeRuntimeState>,
) {
  const upstreamIds = workflow.edges.filter((e) => e.target === node.id).map((e) => e.source);
  return upstreamIds.map((id) => runtimeByNode.get(id)?.preview?.columns ?? []);
}
