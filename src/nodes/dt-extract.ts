import type { NodeType } from '@/lib/types';

import { parseStringArray, validateColumnsExist } from './column-utils';
import type { NodeDefinition } from './types';

export const DT_EXTRACT_PARTS = [
  'year',
  'month',
  'day',
  'dayofweek',
  'weekday',
  'quarter',
  'hour',
  'weekofyear',
  'is_weekend',
  'dayofyear',
] as const;

const VALID_PARTS = new Set<string>(DT_EXTRACT_PARTS);

const PART_LABELS: Record<(typeof DT_EXTRACT_PARTS)[number], string> = {
  year: 'Year',
  month: 'Month',
  day: 'Day',
  dayofweek: 'Day of week',
  weekday: 'Weekday',
  quarter: 'Quarter',
  hour: 'Hour',
  weekofyear: 'Week of year',
  is_weekend: 'Is weekend',
  dayofyear: 'Day of year',
};

function parseParts(config: Record<string, unknown>): string[] {
  const raw = parseStringArray(config.parts);
  return raw.filter((part) => VALID_PARTS.has(part));
}

function parseParse(config: Record<string, unknown>): boolean {
  return config.parse === true;
}

function parseFormat(config: Record<string, unknown>): string | undefined {
  const format = config.format;
  return typeof format === 'string' && format.trim() ? format.trim() : undefined;
}

function partAccessor(part: string): string {
  switch (part) {
    case 'weekday':
      return 'dayofweek';
    case 'weekofyear':
      return 'isocalendar().week';
    case 'is_weekend':
      return 'dayofweek >= 5';
    default:
      return part;
  }
}

function partOutputName(column: string, part: string): string {
  const normalized = part === 'weekday' ? 'dayofweek' : part;
  return `${column}_${normalized}`;
}

export const dtExtract: NodeDefinition = {
  type: 'dt.extract' as NodeType,
  label: 'Extract Date Part',
  category: 'transform',
  paletteGroup: 'datetime',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      column: '',
      parts: ['year', 'month', 'day'] as string[],
      parse: false,
      format: '',
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const rawParts = parseStringArray(config.parts);
    const parts = parseParts(config);
    const upstream = inputSchemas[0] ?? [];

    if (!column) {
      errors.push({ field: 'column', message: 'Column is required' });
    } else {
      errors.push(...validateColumnsExist([column], upstream, 'column'));
    }

    if (rawParts.length === 0) {
      errors.push({ field: 'parts', message: 'Select at least one date part' });
    } else if (parts.length !== rawParts.length) {
      errors.push({ field: 'parts', message: 'One or more date parts are not supported' });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, _context?) {
    void _params;
    void _context;
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const parts = parseParts(config);
    const shouldParse = parseParse(config);
    const format = parseFormat(config);
    const input = inputVars[0];
    const srcVar = `_${outputVar}_dt_src`;

    const lines: string[] = [];
    if (shouldParse) {
      const formatArg = format ? `, format=${JSON.stringify(format)}` : '';
      lines.push(
        `${srcVar} = pd.to_datetime(${input}[${JSON.stringify(column)}]${formatArg}, errors='coerce')`,
      );
    } else {
      lines.push(`${srcVar} = ${input}[${JSON.stringify(column)}]`);
    }

    const assignEntries = parts.map((part) => {
      const outName = partOutputName(column, part);
      const accessor = partAccessor(part);
      if (part === 'is_weekend') {
        return `${JSON.stringify(outName)}: (${srcVar}.dt.${accessor})`;
      }
      if (part === 'weekofyear') {
        return `${JSON.stringify(outName)}: ${srcVar}.dt.isocalendar().week`;
      }
      return `${JSON.stringify(outName)}: ${srcVar}.dt.${accessor}`;
    });

    lines.push(`${outputVar} = ${input}.assign(${assignEntries.join(', ')})`);
    return lines.join('\n');
  },

  inspectorSchema() {
    return [
      { kind: 'column', key: 'column', label: 'Column' },
      {
        kind: 'multi-select',
        key: 'parts',
        label: 'Parts',
        options: [...DT_EXTRACT_PARTS],
        optionLabels: PART_LABELS,
      },
      { kind: 'select', key: 'parse', label: 'Parse strings first', options: ['true', 'false'] },
      { kind: 'text', key: 'format', label: 'Parse format (optional)' },
    ];
  },

  configSummary(config) {
    const column = typeof config.column === 'string' ? config.column : '';
    const parts = parseParts(config);
    if (!column) return 'No column';
    if (parts.length === 0) return column;
    return `${column} → ${parts.join(', ')}`;
  },
};
