import type { NodeType } from '@/lib/types';

import { validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

type SplitColumnNode = NodeDefinition & {
  paletteGroup: 'column';
  paletteOrder: number;
  exportVarSlug: string;
};

function parseColumn(config: Record<string, unknown>): string {
  return typeof config.column === 'string' ? config.column.trim() : '';
}

function parseInto(config: Record<string, unknown>): string[] {
  if (!Array.isArray(config.into)) return [];
  return config.into.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function parsePat(config: Record<string, unknown>): string {
  return typeof config.pat === 'string' ? config.pat : ',';
}

function parseExpand(config: Record<string, unknown>): boolean {
  return config.expand !== false;
}

function parseN(config: Record<string, unknown>): number {
  if (typeof config.n === 'number' && Number.isFinite(config.n)) {
    return Math.trunc(config.n);
  }
  return -1;
}

function parseRegex(config: Record<string, unknown>): boolean {
  return config.regex === true;
}

export const splitColumn = {
  type: 'split.column' as NodeType,
  label: 'Split Column',
  category: 'transform',
  paletteGroup: 'column',
  paletteOrder: 7,
  exportVarSlug: 'split_cols',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      column: '',
      pat: ',',
      regex: false,
      into: [] as string[],
      expand: true,
      n: -1,
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const column = parseColumn(config);
    const upstream = inputSchemas[0] ?? [];

    if (!column) {
      errors.push({ field: 'column', message: 'Column to split is required' });
    } else {
      errors.push(...validateColumnsExist([column], upstream, 'column'));
      const colSchema = upstream.find((c) => c.name === column);
      if (
        colSchema &&
        colSchema.dtype !== 'string' &&
        colSchema.dtype !== 'unknown'
      ) {
        errors.push({
          field: 'column',
          message: 'Split column works best on string-like columns',
        });
      }
    }

    const into = parseInto(config);
    if (into.length === 0) {
      errors.push({ field: 'into', message: 'Provide at least one output column name' });
    }

    const pat = parsePat(config);
    if (!pat) {
      errors.push({ field: 'pat', message: 'Delimiter or pattern is required' });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const input = inputVars[0];
    const column = parseColumn(config);
    const pat = parsePat(config);
    const into = parseInto(config);
    const expand = parseExpand(config);
    const n = parseN(config);
    const regex = parseRegex(config);
    const splitVar = `${outputVar}_split`;

    const splitArgs = [
      `pat=${JSON.stringify(pat)}`,
      `n=${n}`,
      `expand=${expand ? 'True' : 'False'}`,
      `regex=${regex ? 'True' : 'False'}`,
    ].join(', ');

    const intoList = into.map((c) => JSON.stringify(c)).join(', ');
    return [
      `${splitVar} = ${input}[${JSON.stringify(column)}].astype(str).str.split(${splitArgs})`,
      `${splitVar}.columns = [${intoList}][:len(${splitVar}.columns)]`,
      `${outputVar} = pd.concat([${input}, ${splitVar}], axis=1)`,
    ].join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'column', key: 'column', label: 'Column' },
      { kind: 'text', key: 'pat', label: 'Delimiter / pattern' },
      { kind: 'select', key: 'regex', label: 'Regex', options: ['false', 'true'] },
      { kind: 'string-list', key: 'into', label: 'Output column names' },
      { kind: 'select', key: 'expand', label: 'Expand', options: ['true', 'false'] },
      { kind: 'number', key: 'n', label: 'Max splits (-1 = all)' },
    ];
  },

  configSummary(config) {
    const column = parseColumn(config);
    const into = parseInto(config);
    if (!column) return 'No column';
    const pat = parsePat(config);
    const names = into.length > 2 ? `${into.slice(0, 2).join(', ')}…` : into.join(', ');
    return `${column} → ${names} (${pat})`;
  },
} satisfies SplitColumnNode;
