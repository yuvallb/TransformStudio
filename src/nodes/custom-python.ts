import { CUSTOM_PYTHON_ENABLED } from '@/lib/constants';
import { nodeType, type PaletteNodeDefinition } from './node-type';
import type { CompileContext } from './types';

const BLOCKED_PATTERNS = [
  /\bimport\b/i,
  /\bfrom\s+\w+\s+import\b/i,
  /\bexec\b/i,
  /\beval\s*\(/i,
  /\bopen\s*\(/i,
  /\b__\w+__\b/,
  /\bgetattr\b/i,
  /\bsetattr\b/i,
  /\bglobals\b/i,
  /\blocals\b/i,
  /\bos\./i,
  /\bsys\./i,
  /\bsubprocess\b/i,
  /\bcompile\s*\(/i,
];

export const CUSTOM_PYTHON_INPUT_ALIAS = 'inp';
export const CUSTOM_PYTHON_OUTPUT_ALIAS = 'out';

/** Shown in the inspector above the code editor. */
export const CUSTOM_PYTHON_INSPECTOR_HELP = [
  'Pre-loaded names (do not use import):',
  '• inp — input DataFrame',
  '• out — assign your result here',
  '• pd — pandas',
  '• np — numpy',
  '• params — workflow parameters, e.g. params["threshold"]',
  '',
  'Allowed: assignments, if / for / while, Pandas method calls (including keyword args), and built-ins like len(), min(), max().',
  '',
  'Blocked: import, def / class / lambda, try / with, file I/O (open), exec / eval, and attributes starting with _.',
].join('\n');

export const CUSTOM_PYTHON_DEFAULT_CODE = `# Input DataFrame: \`${CUSTOM_PYTHON_INPUT_ALIAS}\`. Assign the result to \`${CUSTOM_PYTHON_OUTPUT_ALIAS}\`.
# Pre-loaded: pd, np, params — no import statements needed.
${CUSTOM_PYTHON_OUTPUT_ALIAS} = ${CUSTOM_PYTHON_INPUT_ALIAS}.copy()
# Example: ${CUSTOM_PYTHON_OUTPUT_ALIAS} = ${CUSTOM_PYTHON_INPUT_ALIAS}.reset_index(drop=True)
`;

export function isCustomPythonSafe(code: string): boolean {
  return !BLOCKED_PATTERNS.some((pattern) => pattern.test(code));
}

export const customPython: PaletteNodeDefinition = {
  type: nodeType('custom.python'),
  label: 'Custom Python',
  category: 'transform',
  paletteGroup: 'python',
  paletteAdvanced: true,
  hiddenInPalette: !CUSTOM_PYTHON_ENABLED,
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return { code: CUSTOM_PYTHON_DEFAULT_CODE };
  },

  validate(config, _inputSchemas) {
    void _inputSchemas;

    const errors = [];
    if (!CUSTOM_PYTHON_ENABLED) {
      errors.push({
        message: 'Custom Python nodes are disabled — set VITE_ENABLE_CUSTOM_PYTHON=true',
      });
      return errors;
    }

    const code = typeof config.code === 'string' ? config.code.trim() : '';

    if (!code) {
      errors.push({ field: 'code', message: 'Python code is required' });
      return errors;
    }

    if (!isCustomPythonSafe(code)) {
      errors.push({
        field: 'code',
        message: 'Code contains disallowed patterns (import, exec, open, dunder access)',
      });
    }

    return errors;
  },

  compile(config, inputVars, outputVar, _params?, context?: CompileContext) {
    void _params;
    const code = typeof config.code === 'string' ? config.code.trim() : '';
    const input = inputVars[0];
    const lines: string[] = [];

    if (context?.mode === 'export') {
      lines.push(
        '# WARNING: Custom Python — review user-supplied code before running outside RefineIt',
      );
    }

    lines.push(
      `# Custom Python — input is \`${CUSTOM_PYTHON_INPUT_ALIAS}\`, assign result to \`${CUSTOM_PYTHON_OUTPUT_ALIAS}\``,
      `${CUSTOM_PYTHON_INPUT_ALIAS} = ${input}`,
      `${CUSTOM_PYTHON_OUTPUT_ALIAS} = ${CUSTOM_PYTHON_INPUT_ALIAS}.copy()`,
      code,
      `${outputVar} = ${CUSTOM_PYTHON_OUTPUT_ALIAS}`,
    );

    return lines.join('\n');
  },

  inspectorSchema() {
    return [
      {
        kind: 'code',
        key: 'code',
        label: 'Python code',
        minHeight: '180px',
        description: CUSTOM_PYTHON_INSPECTOR_HELP,
      },
    ];
  },

  configSummary(config) {
    const code = typeof config.code === 'string' ? config.code.trim() : '';
    if (!code) return 'No code';
    const firstLine = code.split('\n')[0] ?? '';
    return firstLine.length > 40 ? `${firstLine.slice(0, 37)}…` : firstLine;
  },
};
