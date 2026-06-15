import { extractParamRefs } from '@/engine/param-substitute';
import { extractBracketColumns, hasParamRefs, isExpressionSafe, normalizeExpression } from './expression';
import type { NodeDefinition } from './types';

export const derive: NodeDefinition = {
  type: 'derive',
  label: 'Derive',
  category: 'transform',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { column: '', expression: '' };
  },

  validate(config, inputSchemas, context) {
    const errors = [];
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const expression = typeof config.expression === 'string' ? config.expression.trim() : '';
    const upstream = inputSchemas[0] ?? [];
    const colNames = new Set(upstream.map((c) => c.name));

    if (!column) {
      errors.push({ field: 'column', message: 'Output column name is required' });
    } else if (upstream.length > 0 && colNames.has(column)) {
      errors.push({ field: 'column', message: `Column "${column}" already exists` });
    }

    if (!expression) {
      errors.push({ field: 'expression', message: 'Expression is required' });
    } else if (!isExpressionSafe(expression)) {
      errors.push({ field: 'expression', message: 'Expression contains disallowed patterns' });
    } else if (upstream.length > 0) {
      for (const col of extractBracketColumns(expression)) {
        if (!colNames.has(col)) {
          errors.push({ field: 'expression', message: `Column "${col}" not found upstream` });
        }
      }
    }

    const paramNames = new Set(context?.workflowParamNames ?? []);
    for (const ref of extractParamRefs(expression)) {
      if (!paramNames.has(ref)) {
        errors.push({ field: 'expression', message: `Unknown parameter "{${ref}}" — define it in Parameters` });
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params, context) {
    void _params;
    const column = typeof config.column === 'string' ? config.column.trim() : '';
    const expression = typeof config.expression === 'string' ? config.expression.trim() : '';
    const input = inputVars[0];
    const normalized = normalizeExpression(expression, input);
    void context;

    if (hasParamRefs(expression)) {
      return `${outputVar} = ${input}.assign(**{${JSON.stringify(column)}: ${normalized}})`;
    }

    return `${outputVar} = ${input}.assign(**{${JSON.stringify(column)}: ${input}.eval(${JSON.stringify(normalized)})})`;
  },

  inspectorSchema() {
    return [
      { kind: 'text', key: 'column', label: 'New column name' },
      { kind: 'expression', key: 'expression', label: 'Expression' },
    ];
  },

  configSummary(config) {
    const column = typeof config.column === 'string' ? config.column : '';
    const expression = typeof config.expression === 'string' ? config.expression : '';
    if (!column && !expression) return 'No derivation';
    if (!expression) return column;
    const expr = expression.length > 30 ? `${expression.slice(0, 27)}…` : expression;
    return `${column} = ${expr}`;
  },
};
