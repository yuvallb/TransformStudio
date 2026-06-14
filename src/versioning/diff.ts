import type { ConfigFieldDiff, Workflow, WorkflowDiff, WorkflowNode } from '@/lib/types';

function collectConfigKeys(config: Record<string, unknown>): string[] {
  return Object.keys(config).sort();
}

function diffConfig(
  oldConfig: Record<string, unknown>,
  newConfig: Record<string, unknown>,
): ConfigFieldDiff[] {
  const keys = new Set([...collectConfigKeys(oldConfig), ...collectConfigKeys(newConfig)]);
  const diffs: ConfigFieldDiff[] = [];

  for (const field of [...keys].sort()) {
    const oldValue = oldConfig[field];
    const newValue = newConfig[field];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffs.push({ field, oldValue, newValue });
    }
  }

  return diffs;
}

function nodesEqual(a: WorkflowNode, b: WorkflowNode): boolean {
  if (a.type !== b.type) return false;
  if (JSON.stringify(a.config) !== JSON.stringify(b.config)) return false;
  if (a.position.x !== b.position.x || a.position.y !== b.position.y) return false;
  if (a.title !== b.title) return false;
  return true;
}

function paramsEqual(base: Workflow, target: Workflow): boolean {
  return JSON.stringify(base.params) === JSON.stringify(target.params);
}

function edgesEqual(base: Workflow, target: Workflow): boolean {
  const normalize = (w: Workflow) =>
    [...w.edges]
      .map((e) => `${e.source}|${e.target}|${e.sourceHandle ?? ''}|${e.targetHandle ?? ''}`)
      .sort()
      .join(';');
  return normalize(base) === normalize(target);
}

export function diffWorkflows(base: Workflow, target: Workflow): WorkflowDiff {
  const baseIds = new Set(base.nodes.map((n) => n.id));
  const targetIds = new Set(target.nodes.map((n) => n.id));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  const unchanged: string[] = [];
  const configDiffs: Record<string, ConfigFieldDiff[]> = {};

  for (const id of targetIds) {
    if (!baseIds.has(id)) {
      added.push(id);
    }
  }

  for (const id of baseIds) {
    if (!targetIds.has(id)) {
      removed.push(id);
    }
  }

  for (const id of baseIds) {
    if (!targetIds.has(id)) continue;

    const baseNode = base.nodes.find((n) => n.id === id)!;
    const targetNode = target.nodes.find((n) => n.id === id)!;

    if (nodesEqual(baseNode, targetNode)) {
      unchanged.push(id);
    } else {
      modified.push(id);
      configDiffs[id] = diffConfig(baseNode.config, targetNode.config);
    }
  }

  const paramsChanged = !paramsEqual(base, target);
  const edgesChanged = !edgesEqual(base, target);

  if (edgesChanged) {
    for (const id of [...unchanged]) {
      modified.push(id);
      unchanged.splice(unchanged.indexOf(id), 1);
    }
  }

  return {
    added,
    removed,
    modified,
    unchanged,
    configDiffs,
    paramsChanged,
  };
}

export function diffWorkflowParams(base: Workflow, target: Workflow): ConfigFieldDiff[] {
  const baseMap = new Map(base.params.map((p) => [p.name, p]));
  const targetMap = new Map(target.params.map((p) => [p.name, p]));
  const names = new Set([...baseMap.keys(), ...targetMap.keys()]);
  const diffs: ConfigFieldDiff[] = [];

  for (const name of [...names].sort()) {
    const oldValue = baseMap.get(name);
    const newValue = targetMap.get(name);
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffs.push({ field: name, oldValue, newValue });
    }
  }

  return diffs;
}

export function getNodeDiffStatus(
  nodeId: string,
  diff: WorkflowDiff,
): 'added' | 'removed' | 'modified' | 'unchanged' | null {
  if (diff.added.includes(nodeId)) return 'added';
  if (diff.removed.includes(nodeId)) return 'removed';
  if (diff.modified.includes(nodeId)) return 'modified';
  if (diff.unchanged.includes(nodeId)) return 'unchanged';
  return null;
}
