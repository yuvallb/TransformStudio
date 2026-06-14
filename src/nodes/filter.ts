import type { NodeDefinition } from './types';

const BLOCKED_PATTERNS = [
  /\bimport\b/i,
  /\bexec\b/i,
  /\beval\s*\(/i,
  /__/,
  /\bopen\s*\(/i,
  /\bgetattr\b/i,
  /\bsetattr\b/i,
  /\bglobals\b/i,
  /\blocals\b/i,
  /\bos\./i,
  /\bsys\./i,
];

function translateExpression(expression: string): string {
  return expression.replace(/\{(\w+)\}/g, "params['$1']");
}

export function isExpressionSafe(expression: string): boolean {
  return !BLOCKED_PATTERNS.some((pattern) => pattern.test(expression));
}

export const filter: NodeDefinition = {
  type: 'filter',
  label: 'Filter',
  category: 'transform',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { expression: '' };
  },

  validate(config, inputSchemas) {
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
      const colMatch = expression.match(/\[["']([^"']+)["']\]/g);
      if (colMatch) {
        const colNames = new Set(upstream.map((c) => c.name));
        for (const match of colMatch) {
          const col = match.slice(2, -2);
          if (!colNames.has(col)) {
            errors.push({ field: 'expression', message: `Column "${col}" not found upstream` });
          }
        }
      }
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params) {
    void _params;
    const raw = typeof config.expression === 'string' ? config.expression.trim() : '';
    const input = inputVars[0];
    const normalized = translateExpression(raw).replace(/\bdf\b/g, input);

    if (normalized.includes('[')) {
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
