import type { NodeDefinition } from './types';

type AggFunc = 'sum' | 'mean' | 'count' | 'min' | 'max';

interface Aggregation {
  column: string;
  func: AggFunc;
}

function parseAggregations(config: Record<string, unknown>): Aggregation[] {
  if (!Array.isArray(config.aggregations)) return [];
  return config.aggregations.filter(
    (item): item is Aggregation =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Aggregation).column === 'string' &&
      typeof (item as Aggregation).func === 'string',
  );
}

function parseGroupColumns(config: Record<string, unknown>): string[] {
  if (!Array.isArray(config.groupColumns)) return [];
  return config.groupColumns.filter((col): col is string => typeof col === 'string');
}

export const groupby: NodeDefinition = {
  type: 'groupby',
  label: 'GroupBy',
  category: 'transform',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      groupColumns: [] as string[],
      aggregations: [{ column: '', func: 'sum' }] as Aggregation[],
    };
  },

  validate(config, inputSchemas) {
    const errors = [];
    const groupColumns = parseGroupColumns(config);
    const aggregations = parseAggregations(config);
    const upstream = inputSchemas[0] ?? [];
    const colNames = new Set(upstream.map((c) => c.name));

    if (groupColumns.length === 0) {
      errors.push({ field: 'groupColumns', message: 'Select at least one group column' });
    }

    for (const col of groupColumns) {
      if (upstream.length > 0 && !colNames.has(col)) {
        errors.push({ field: 'groupColumns', message: `Column "${col}" not found upstream` });
      }
    }

    if (aggregations.length === 0) {
      errors.push({ field: 'aggregations', message: 'Add at least one aggregation' });
    }

    for (const agg of aggregations) {
      if (!agg.column) {
        errors.push({ field: 'aggregations', message: 'Aggregation column is required' });
      } else if (upstream.length > 0 && !colNames.has(agg.column)) {
        errors.push({
          field: 'aggregations',
          message: `Aggregation column "${agg.column}" not found upstream`,
        });
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar) {
    const groupColumns = parseGroupColumns(config);
    const aggregations = parseAggregations(config);
    const input = inputVars[0];
    const groupSet = new Set(groupColumns);
    const groupList = groupColumns.map((c) => JSON.stringify(c)).join(', ');

    const dictEntries: string[] = [];
    const namedEntries: string[] = [];
    const reservedNames = new Set(groupColumns);

    for (const agg of aggregations) {
      if (groupSet.has(agg.column)) {
        let outName = `${agg.column}_${agg.func}`;
        let suffix = 2;
        while (reservedNames.has(outName)) {
          outName = `${agg.column}_${agg.func}_${suffix}`;
          suffix += 1;
        }
        reservedNames.add(outName);
        namedEntries.push(
          `${outName}=(${JSON.stringify(agg.column)}, ${JSON.stringify(agg.func)})`,
        );
      } else {
        dictEntries.push(`${JSON.stringify(agg.column)}: ${JSON.stringify(agg.func)}`);
      }
    }

    const aggArgs = [
      ...(dictEntries.length > 0 ? [`{${dictEntries.join(', ')}}`] : []),
      ...namedEntries,
    ].join(', ');

    return `${outputVar} = ${input}.groupby([${groupList}]).agg(${aggArgs}).reset_index()`;
  },

  inspectorSchema() {
    return [
      { kind: 'columns', key: 'groupColumns', label: 'Group columns' },
      { kind: 'aggregations', key: 'aggregations', label: 'Aggregations' },
    ];
  },

  configSummary(config) {
    const groupColumns = parseGroupColumns(config);
    const aggregations = parseAggregations(config);
    if (groupColumns.length === 0) return 'No grouping';
    const aggText = aggregations.map((a) => `${a.func}(${a.column})`).join(', ');
    return `by ${groupColumns.join(', ')} → ${aggText || '…'}`;
  },
};
