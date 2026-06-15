import { getNodeDefinition } from '@/nodes/registry';

import type { Workflow, WorkflowEdge } from '@/lib/types';

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
