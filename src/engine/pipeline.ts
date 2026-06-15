import { getNodeDefinition } from '@/nodes/registry';
import { normalizeExpression } from '@/nodes/expression';
import { kernelClient } from '@/engine/kernel-client';

import type {
  ExecutePipelineRequest,
  NodeDataset,
  NodeRuntimeState,
  Workflow,
  WorkflowNode,
} from '@/lib/types';
import { computeDatasetFingerprint, computeFingerprint } from './fingerprint';
import { getEffectiveParams, resolveParamsForNode } from './param-substitute';
import { getInputVars, getUpstreamNodeIds, getUpstreamSchemas, topoSort } from './topo-sort';
import type { ValidateContext } from '@/nodes/types';

export interface BuildPipelineOptions {
  workflow: Workflow;
  staleNodeIds: Set<string>;
  runtimeByNode: Map<string, NodeRuntimeState>;
  datasets: Record<string, NodeDataset>;
  paramOverrides?: Record<string, unknown>;
}

async function resolveNodeFingerprint(
  node: WorkflowNode,
  workflow: Workflow,
  runtimeByNode: Map<string, NodeRuntimeState>,
  datasets: Record<string, NodeDataset>,
  paramRecord: Record<string, unknown>,
): Promise<string> {
  const def = getNodeDefinition(node.type);
  const dataset = datasets[node.id];
  let datasetFingerprint: string | null = null;
  if (dataset) {
    datasetFingerprint = await computeDatasetFingerprint(dataset.data);
  }

  const upstreamFingerprints = getInputVars(node.id, workflow.edges, def.inputs).map((varName) => {
    const upstreamId = varName.replace('node_', '');
    return runtimeByNode.get(upstreamId)?.fingerprint ?? '';
  });

  return computeFingerprint(
    node,
    resolveParamsForNode(node, paramRecord),
    upstreamFingerprints,
    datasetFingerprint,
  );
}

function upstreamIsReady(
  nodeId: string,
  workflow: Workflow,
  staleNodeIds: Set<string>,
  runtimeByNode: Map<string, NodeRuntimeState>,
  plannedIds: Set<string>,
): boolean {
  const upstreamIds = getUpstreamNodeIds(nodeId, workflow.edges);
  return upstreamIds.every((upstreamId) => {
    if (plannedIds.has(upstreamId)) return true;
    if (staleNodeIds.has(upstreamId)) return false;

    const cached = runtimeByNode.get(upstreamId);
    return cached?.status === 'success' && cached.fingerprint !== null;
  });
}

export function getValidateContext(
  node: WorkflowNode,
  workflow: Workflow,
  runtimeByNode: Map<string, NodeRuntimeState>,
  inputPorts: { id: string; label: string }[],
): ValidateContext {
  const inputVars = getInputVars(node.id, workflow.edges, inputPorts);
  const inputRowCounts: number[] = [];

  for (const port of inputPorts) {
    const edge = workflow.edges.find(
      (e) =>
        e.target === node.id && (e.targetHandle ?? inputPorts[0]?.id) === port.id,
    );
    if (!edge) continue;
    const rows = runtimeByNode.get(edge.source)?.preview?.totalRows;
    if (typeof rows === 'number') {
      inputRowCounts.push(rows);
    }
  }

  return {
    inputVarCount: inputVars.length,
    inputRowCounts: inputRowCounts.length === inputPorts.length ? inputRowCounts : undefined,
    workflowParamNames: workflow.params.map((p) => p.name),
  };
}

export interface BuildPipelineResult extends ExecutePipelineRequest {
  validationFailures: { nodeId: string; message: string }[];
}

async function validateExpressionForNode(
  node: WorkflowNode,
  inputVars: string[],
): Promise<string | null> {
  if (node.type !== 'filter' && node.type !== 'derive') {
    return null;
  }

  const expression =
    typeof node.config.expression === 'string' ? node.config.expression.trim() : '';
  if (!expression) {
    return 'Expression is required';
  }

  const input = inputVars[0] ?? 'df';
  const normalized = normalizeExpression(expression, input);
  const result = await kernelClient.validateExpression(normalized);
  if (!result.valid) {
    return result.error ?? 'Expression failed security validation';
  }

  return null;
}

export async function buildPipelineRequest(
  options: BuildPipelineOptions,
): Promise<BuildPipelineResult> {
  const { workflow, staleNodeIds, runtimeByNode, datasets, paramOverrides } = options;
  const sorted = topoSort(workflow.nodes, workflow.edges);
  const paramRecord = getEffectiveParams(workflow.params, paramOverrides);
  const nodes: ExecutePipelineRequest['nodes'] = [];
  const validationFailures: BuildPipelineResult['validationFailures'] = [];
  const plannedIds = new Set<string>();

  for (const node of sorted) {
    const def = getNodeDefinition(node.type);
    const inputVars = getInputVars(node.id, workflow.edges, def.inputs);
    const outputVar = `node_${node.id}`;
    const isStale = staleNodeIds.has(node.id);
    const dataset = datasets[node.id];

    if (def.inputs.length > 0 && inputVars.length < def.inputs.length) {
      continue;
    }

    if (def.inputs.length > 0 && !upstreamIsReady(node.id, workflow, staleNodeIds, runtimeByNode, plannedIds)) {
      continue;
    }

    if (node.type === 'source.csv' && !dataset) {
      continue;
    }

    if (node.type === 'source.json' && !dataset) {
      continue;
    }

    const inputSchemas = getUpstreamSchemas(node.id, workflow.edges, runtimeByNode, def.inputs);
    const validateContext = getValidateContext(node, workflow, runtimeByNode, def.inputs);
    const configErrors = def.validate(node.config, inputSchemas, validateContext);
    if (configErrors.length > 0) {
      validationFailures.push({
        nodeId: node.id,
        message: configErrors.map((e) => e.message).join('; '),
      });
      continue;
    }

    const expressionError = await validateExpressionForNode(node, inputVars);
    if (expressionError) {
      validationFailures.push({ nodeId: node.id, message: expressionError });
      continue;
    }

    const fingerprint = await resolveNodeFingerprint(
      node,
      workflow,
      runtimeByNode,
      datasets,
      paramRecord,
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

    if (node.type === 'source.json' && dataset) {
      entry.jsonBytes = dataset.data;
    }

    nodes.push(entry);
    plannedIds.add(node.id);
  }

  return { nodes, params: paramRecord, validationFailures };
}

export async function updateRuntimeFingerprints(
  workflow: Workflow,
  runtimeByNode: Map<string, NodeRuntimeState>,
  datasets: Record<string, NodeDataset>,
  executedNodeIds: string[],
  paramOverrides?: Record<string, unknown>,
): Promise<Map<string, NodeRuntimeState>> {
  const next = new Map(runtimeByNode);
  const paramRecord = getEffectiveParams(workflow.params, paramOverrides);

  for (const nodeId of executedNodeIds) {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const fingerprint = await resolveNodeFingerprint(node, workflow, next, datasets, paramRecord);

    const existing = next.get(nodeId);
    if (existing) {
      next.set(nodeId, { ...existing, fingerprint });
    }
  }

  return next;
}

export function getUpstreamSchemasForNode(
  node: WorkflowNode,
  workflow: Workflow,
  runtimeByNode: Map<string, NodeRuntimeState>,
) {
  const def = getNodeDefinition(node.type);
  return getUpstreamSchemas(node.id, workflow.edges, runtimeByNode, def.inputs);
}
