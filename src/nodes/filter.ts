import { extractParamRefs } from '@/engine/param-substitute';
import {
  hasParamRefs,
  isExpressionSafe,
  normalizeExpression,
  validateExpressionColumns,
} from './expression';
import type { NodeDefinition } from './types';

export { isExpressionSafe } from './expression';

export const filter: NodeDefinition = {
  type: 'filter',
  label: 'Filter',
  category: 'transform',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { expression: '' };
  },

  validate(config, inputSchemas, context) {
    const errors = [];
    const expression = typeof config.expression === 'string' ? config.expression.trim() : '';

    if (!expression) {
      errors.push({ field: 'expression', message: 'Filter expression is required' });
      return errors;
    }

    if (!isExpressionSafe(expression)) {
      errors.push({ field: 'expression', message: 'Expression contains disallowed patterns' });
    }

    const upstream = inputSchemas[0] ?? [];
    if (upstream.length > 0) {
      for (const message of validateExpressionColumns(expression, upstream.map((c) => c.name))) {
        errors.push({ field: 'expression', message });
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

  compile(config, inputVars, outputVar, _params, _context) {
    void _params;
    void _context;
    const raw = typeof config.expression === 'string' ? config.expression.trim() : '';
    const input = inputVars[0];
    const normalized = normalizeExpression(raw, input);

    if (hasParamRefs(raw)) {
      return `${outputVar} = ${input}[${normalized}]`;
    }

    return `${outputVar} = ${input}[${input}.eval(${JSON.stringify(normalized)})]`;
  },

  inspectorSchema() {
    return [{ kind: 'expression', key: 'expression', label: 'Filter expression' }];
  },

  configSummary(config) {
    const expression = typeof config.expression === 'string' ? config.expression : '';
    if (!expression) return 'No expression';
    return expression.length > 40 ? `${expression.slice(0, 37)}…` : expression;
  },
};
