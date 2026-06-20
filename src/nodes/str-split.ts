import type { NodeType } from '@/lib/types';

import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

function parsePat(config: Record<string, unknown>): string {
  return typeof config.pat === 'string' ? config.pat : ',';
}

function parseExpand(config: Record<string, unknown>): boolean {
  return config.expand === true;
}

function parseExplode(config: Record<string, unknown>): boolean {
  return config.explode === true;
}

function parseN(config: Record<string, unknown>): number {
  return typeof config.n === 'number' && config.n >= 0 ? config.n : -1;
}

export const strSplit: NodeDefinition = {
  type: 'str.split' as NodeType,
  label: 'Split Text',
  category: 'transform',
  paletteGroup: 'text',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      column: '',
      pat: ',',
      expand: true,
      explode: false,
      n: -1,
      into: [] as string[],
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const pat = parsePat(config);
    const into = parseStringArray(config.into);
    const expand = parseExpand(config);
    const upstream = inputSchemas[0] ?? [];

    if (!column) {
      errors.push({ field: 'column', message: 'Column is required' });
    } else {
      errors.push(...validateColumnsExist([column], upstream, 'column'));
    }

    if (!pat) {
      errors.push({ field: 'pat', message: 'Delimiter or pattern is required' });
    }

    if (expand && into.length === 0) {
      errors.push({ field: 'into', message: 'Provide output column names when expanding' });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const pat = parsePat(config);
    const expand = parseExpand(config);
    const explode = parseExplode(config);
    const n = parseN(config);
    const into = parseStringArray(config.into);
    const input = inputVars[0];
    const colExpr = `${input}[${JSON.stringify(column)}]`;

    if (explode && !expand) {
      const tmp = `_${outputVar}_split`;
      return [
        `${outputVar} = ${input}.assign(**{${JSON.stringify(tmp)}: ${colExpr}.str.split(${JSON.stringify(pat)}, n=${n})})`,
        `${outputVar} = ${outputVar}.explode(${JSON.stringify(tmp)})`,
      ].join('\n');
    }

    const tmpSplit = `_${outputVar}_split`;
    const lines = [
      `${tmpSplit} = ${colExpr}.str.split(${JSON.stringify(pat)}, n=${n}, expand=True)`,
    ];
    if (into.length > 0) {
      lines.push(`${tmpSplit}.columns = [${into.map((c) => JSON.stringify(c)).join(', ')}]`);
    }
    lines.push(`${outputVar} = pd.concat([${input}, ${tmpSplit}], axis=1)`);
    return lines.join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'column', key: 'column', label: 'Column' },
      { kind: 'text', key: 'pat', label: 'Delimiter / pattern' },
      { kind: 'select', key: 'expand', label: 'Expand to columns', options: ['true', 'false'] },
      { kind: 'select', key: 'explode', label: 'Explode to rows', options: ['true', 'false'] },
      { kind: 'number', key: 'n', label: 'Max splits (-1 = all)' },
      { kind: 'string-list', key: 'into', label: 'Output column names' },
    ];
  },

  configSummary(config) {
    const column = typeof config.column === 'string' ? config.column : '';
    const pat = parsePat(config);
    if (!column) return 'No column';
    if (parseExplode(config) && !parseExpand(config)) return `${column} split → rows`;
    const into = parseStringArray(config.into);
    const target = into.length > 0 ? into.join(', ') : 'columns';
    return `${column} split on "${pat}" → ${target}`;
  },
};
