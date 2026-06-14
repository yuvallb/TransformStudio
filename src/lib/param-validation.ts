import type { WorkflowParam } from '@/lib/types';

const PARAM_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const PYTHON_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
]);

export function defaultParamValue(type: WorkflowParam['type'], options?: string[]): unknown {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'date':
      return '2024-01-01';
    case 'enum':
      return options?.[0] ?? '';
    case 'boolean':
      return true;
  }
}

export function validateParamName(
  name: string,
  existingNames: string[],
  excludeName?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Parameter name is required';
  if (!PARAM_NAME_REGEX.test(trimmed)) {
    return 'Name must be a valid identifier (letters, numbers, underscore; no spaces)';
  }
  if (PYTHON_KEYWORDS.has(trimmed)) {
    return `"${trimmed}" is a reserved Python keyword`;
  }
  if (existingNames.some((n) => n === trimmed && n !== excludeName)) {
    return `Parameter "${trimmed}" already exists`;
  }
  return null;
}
