import type { NodeType } from '@/lib/types';

import { filter } from './filter';
import { groupby } from './groupby';
import { output } from './output';
import { sourceCsv } from './source-csv';
import type { NodeDefinition } from './types';

export const nodeRegistry: Partial<Record<NodeType, NodeDefinition>> = {
  'source.csv': sourceCsv,
  filter,
  groupby,
  output,
};

export function getNodeDefinition(type: NodeType): NodeDefinition {
  const def = nodeRegistry[type];
  if (!def) {
    throw new Error(`Unknown node type: ${type}`);
  }
  return def;
}

export const m2NodeTypes = Object.keys(nodeRegistry) as NodeType[];

export function getNodesByCategory(): Record<
  'source' | 'transform' | 'output',
  NodeDefinition[]
> {
  const all = Object.values(nodeRegistry) as NodeDefinition[];
  return {
    source: all.filter((n) => n.category === 'source'),
    transform: all.filter((n) => n.category === 'transform'),
    output: all.filter((n) => n.category === 'output'),
  };
}
