import { getNodeDefinition } from '@/nodes/registry';
import type { NodeDefinition } from '@/nodes/types';

import type { Workflow, WorkflowEdge, WorkflowNode } from '@/lib/types';
import { paramsToRecord, sanitizeCommentLine } from '@/lib/utils';

import { getInputVars, topoSort } from './topo-sort';

export type PipelineWorkflow = Pick<Workflow, 'nodes' | 'edges' | 'params'>;

export function getSortedPipelineNodes(workflow: PipelineWorkflow): WorkflowNode[] {
  return topoSort(workflow.nodes, workflow.edges);
}

export function getSetupLines(workflow: PipelineWorkflow): string[] {
  const paramRecord = paramsToRecord(workflow.params);
  const lines = [
    'import pandas as pd',
    'import numpy as np',
    '',
    'pd.options.mode.copy_on_write = True',
  ];

  if (workflow.params.length > 0) {
    lines.push('', `params = ${JSON.stringify(paramRecord, null, 2)}`);
  }

  lines.push('');
  return lines;
}

export function getNodeCommentLines(node: WorkflowNode, def: NodeDefinition): string[] {
  const titleSuffix = node.title ? `: ${sanitizeCommentLine(node.title)}` : '';
  const lines = [`# ${def.label}${titleSuffix}`, `# Node ID: ${node.id}`, `# Type: ${node.type}`];

  if (def.category === 'source') {
    const summary = sanitizeCommentLine(def.configSummary(node.config));
    lines.push(`# Source file: ${summary} — adjust the file path below as needed`);
  }

  return lines;
}

export function getNodeMarkdown(node: WorkflowNode, def: NodeDefinition): string {
  const titleSuffix = node.title ? `: ${sanitizeCommentLine(node.title)}` : '';
  const lines = [
    `## ${def.label}${titleSuffix}`,
    '',
    `Node ID: \`${node.id}\``,
    `Type: \`${node.type}\``,
  ];

  const summary = def.configSummary(node.config);
  if (summary) {
    lines.push('', `Config: ${summary}`);
  }

  if (def.category === 'source') {
    lines.push('', '> Provide the data file at the path shown in the code cell (adjust as needed).');
  }

  return lines.join('\n');
}

export function compileNodeExportCode(
  node: WorkflowNode,
  workflow: PipelineWorkflow,
): string {
  const def = getNodeDefinition(node.type);
  const paramRecord = paramsToRecord(workflow.params);
  const inputVars = getInputVars(node.id, workflow.edges, def.inputs);
  const outputVar = `node_${node.id}`;
  return def.compile(node.config, inputVars, outputVar, paramRecord, { mode: 'export' });
}

export function generatePipelineCode(workflow: PipelineWorkflow): string {
  const lines = [...getSetupLines(workflow)];

  for (const node of getSortedPipelineNodes(workflow)) {
    const def = getNodeDefinition(node.type);
    lines.push(...getNodeCommentLines(node, def));
    lines.push(compileNodeExportCode(node, workflow));
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

export function generateNodeCode(nodeId: string, workflow: PipelineWorkflow): string {
  const node = workflow.nodes.find((n) => n.id === nodeId);
  if (!node) return '';

  return compileNodeExportCode(node, workflow);
}

export function validateConnection(
  sourceType: string,
  targetType: string,
  edges: WorkflowEdge[],
  targetId: string,
  targetHandle?: string | null,
): string | null {
  const def = getNodeDefinition(targetType as Workflow['nodes'][0]['type']);
  const incoming = edges.filter((e) => e.target === targetId);

  if (def.category === 'source') {
    return 'Source nodes cannot have inputs';
  }

  if (incoming.length >= def.inputs.length) {
    return `${def.label} already has the maximum number of inputs`;
  }

  const usedHandles = new Set(
    incoming.map((e) => e.targetHandle ?? def.inputs[0]?.id).filter(Boolean),
  );

  if (def.inputs.length > 1) {
    const handle = targetHandle ?? def.inputs.find((p) => !usedHandles.has(p.id))?.id;
    if (!handle) {
      return `${def.label} has no available input ports`;
    }
    if (usedHandles.has(handle)) {
      return `Input port "${handle}" is already connected`;
    }
  }

  const sourceDef = getNodeDefinition(sourceType as Workflow['nodes'][0]['type']);
  if (sourceDef.category === 'output') {
    return 'Output nodes cannot be connected as sources';
  }

  return null;
}
