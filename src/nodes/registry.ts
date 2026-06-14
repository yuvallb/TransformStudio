import type { NodeType } from '@/lib/types';

import { cast } from './cast';
import { concat } from './concat';
import { derive } from './derive';
import { dropna } from './dropna';
import { fillna } from './fillna';
import { filter } from './filter';
import { groupby } from './groupby';
import { join } from './join';
import { output } from './output';
import { rename } from './rename';
import { select } from './select';
import { sort } from './sort';
import { sourceCsv } from './source-csv';
import { sourceJson } from './source-json';
import type { NodeDefinition } from './types';

export const nodeRegistry: Partial<Record<NodeType, NodeDefinition>> = {
  'source.csv': sourceCsv,
  'source.json': sourceJson,
  filter,
  select,
  rename,
  derive,
  sort,
  groupby,
  join,
  concat,
  dropna,
  fillna,
  cast,
  output,
};

export function isKnownNodeType(type: string): type is NodeType {
  return type in nodeRegistry;
}

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
