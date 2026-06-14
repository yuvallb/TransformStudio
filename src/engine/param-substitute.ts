import type { Workflow, WorkflowNode } from '@/lib/types';
import { paramsToRecord } from '@/lib/utils';

const PARAM_REF_REGEX = /\{(\w+)\}/g;

export function extractParamRefs(text: string): string[] {
  const refs = new Set<string>();
  for (const match of text.matchAll(PARAM_REF_REGEX)) {
    refs.add(match[1]!);
  }
  return [...refs];
}

export function extractParamRefsFromConfig(config: Record<string, unknown>): string[] {
  const refs = new Set<string>();
  for (const value of Object.values(config)) {
    if (typeof value === 'string') {
      for (const ref of extractParamRefs(value)) {
        refs.add(ref);
      }
    }
  }
  return [...refs];
}

export function getEffectiveParams(
  workflowParams: Workflow['params'],
  overrides?: Record<string, unknown> | null,
): Record<string, unknown> {
  const base = paramsToRecord(workflowParams);
  if (!overrides || Object.keys(overrides).length === 0) return base;
  return { ...base, ...overrides };
}

export function resolveParamsForNode(
  node: WorkflowNode,
  allParams: Record<string, unknown>,
): Record<string, unknown> {
  const refs = extractParamRefsFromConfig(node.config);
  const resolved: Record<string, unknown> = {};
  for (const ref of refs) {
    if (ref in allParams) {
      resolved[ref] = allParams[ref];
    }
  }
  return resolved;
}

export function getNodesReferencingParam(
  workflow: Pick<Workflow, 'nodes'>,
  paramName: string,
): string[] {
  return workflow.nodes
    .filter((node) => extractParamRefsFromConfig(node.config).includes(paramName))
    .map((node) => node.id);
}
