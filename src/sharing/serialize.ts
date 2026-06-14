import { migrateWorkflow } from '@/data/migrations';
import { isKnownNodeType } from '@/nodes/registry';
import { WORKFLOW_SCHEMA_VERSION } from '@/lib/constants';
import type { Workflow, WorkflowEdge, WorkflowNode, WorkflowParam } from '@/lib/types';
import { createId } from '@/lib/utils';

export interface ShareableWorkflow {
  schemaVersion: number;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  params: WorkflowParam[];
}

function stripSourceFilenames(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.map((node) => {
    if (!node.type.startsWith('source.')) return node;
    return {
      ...node,
      config: { ...node.config, filename: '' },
    };
  });
}

export function serializeWorkflow(workflow: Workflow): string {
  const payload: ShareableWorkflow = {
    schemaVersion: workflow.schemaVersion,
    name: workflow.name,
    nodes: stripSourceFilenames(workflow.nodes),
    edges: workflow.edges,
    params: workflow.params,
  };
  return JSON.stringify(payload);
}

function validateShareablePayload(parsed: unknown): ShareableWorkflow {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid workflow file: expected a JSON object');
  }

  const record = parsed as Record<string, unknown>;

  if (typeof record.schemaVersion !== 'number') {
    throw new Error('Invalid workflow file: missing schemaVersion');
  }
  if (record.schemaVersion > WORKFLOW_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported workflow version ${record.schemaVersion}. Please update Transform Studio.`,
    );
  }
  if (typeof record.name !== 'string') {
    throw new Error('Invalid workflow file: missing name');
  }
  if (!Array.isArray(record.nodes) || !Array.isArray(record.edges) || !Array.isArray(record.params)) {
    throw new Error('Invalid workflow file: missing nodes, edges, or params');
  }

  for (const node of record.nodes) {
    if (!node || typeof node !== 'object') {
      throw new Error('Invalid workflow file: malformed node entry');
    }
    const nodeType = (node as { type?: unknown }).type;
    if (typeof nodeType !== 'string' || !isKnownNodeType(nodeType)) {
      throw new Error(`Invalid workflow file: unknown node type "${String(nodeType)}"`);
    }
  }

  return {
    schemaVersion: record.schemaVersion,
    name: record.name,
    nodes: record.nodes as ShareableWorkflow['nodes'],
    edges: record.edges as ShareableWorkflow['edges'],
    params: record.params as ShareableWorkflow['params'],
  };
}

export function deserializeWorkflow(json: string): Workflow {
  const payload = validateShareablePayload(JSON.parse(json));
  const now = new Date().toISOString();

  const base: Workflow = {
    id: createId(),
    name: payload.name,
    schemaVersion: payload.schemaVersion,
    nodes: stripSourceFilenames(payload.nodes),
    edges: payload.edges,
    params: payload.params,
    createdAt: now,
    updatedAt: now,
  };

  return migrateWorkflow(base);
}

export function downloadWorkflowFile(workflow: Workflow, filename?: string): void {
  const json = serializeWorkflow(workflow);
  const safeName = workflow.name.replace(/[^\w.-]+/g, '_').replace(/^_|_$/g, '') || 'pipeline';
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename ?? `${safeName}.tstudio.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
