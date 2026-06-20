import type { WorkflowNode } from '@/lib/types';

const DEFAULT_ORIGIN = { x: 80, y: 180 };
const HORIZONTAL_STEP = 220;

export function getNextNodePlacementPosition(
  nodes: Pick<WorkflowNode, 'position'>[],
): { x: number; y: number } {
  if (nodes.length === 0) {
    return { ...DEFAULT_ORIGIN };
  }

  const rightmost = nodes.reduce((max, node) =>
    node.position.x > max.position.x ? node : max,
  );

  return {
    x: rightmost.position.x + HORIZONTAL_STEP,
    y: rightmost.position.y,
  };
}
