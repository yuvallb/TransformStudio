import { validateColumnsExist } from './column-utils';
import type { NodeDefinition, ValidateContext } from './types';

type JoinHow = 'inner' | 'left' | 'right' | 'outer';

function parseHow(config: Record<string, unknown>): JoinHow {
  const how = config.how;
  if (how === 'left' || how === 'right' || how === 'outer') return how;
  return 'inner';
}

function parseSuffixes(config: Record<string, unknown>): [string, string] {
  if (Array.isArray(config.suffixes) && config.suffixes.length === 2) {
    const left = typeof config.suffixes[0] === 'string' ? config.suffixes[0] : '_left';
    const right = typeof config.suffixes[1] === 'string' ? config.suffixes[1] : '_right';
    return [left, right];
  }
  return ['_left', '_right'];
}

export const join: NodeDefinition = {
  type: 'join',
  label: 'Join',
  category: 'transform',
  inputs: [
    { id: 'left', label: 'Left' },
    { id: 'right', label: 'Right' },
  ],
  outputs: 1,

  defaultConfig() {
    return {
      leftOn: '',
      rightOn: '',
      how: 'inner' as JoinHow,
      suffixes: ['_left', '_right'] as [string, string],
    };
  },

  validate(config, inputSchemas, context?: ValidateContext) {
    const errors = [];
    const leftOn = typeof config.leftOn === 'string' ? config.leftOn.trim() : '';
    const rightOn = typeof config.rightOn === 'string' ? config.rightOn.trim() : '';
    const leftSchema = inputSchemas[0] ?? [];
    const rightSchema = inputSchemas[1] ?? [];

    if (context?.inputVarCount !== undefined && context.inputVarCount < 2) {
      errors.push({ field: 'inputs', message: 'Connect both inputs' });
    }

    if (!leftOn) {
      errors.push({ field: 'leftOn', message: 'Left join key is required' });
    } else {
      errors.push(...validateColumnsExist([leftOn], leftSchema, 'leftOn'));
    }

    if (!rightOn) {
      errors.push({ field: 'rightOn', message: 'Right join key is required' });
    } else {
      errors.push(...validateColumnsExist([rightOn], rightSchema, 'rightOn'));
    }

    return errors;
  },

  compile(config, inputVars, outputVar) {
    const left = inputVars[0];
    const right = inputVars[1];
    const leftOn = typeof config.leftOn === 'string' ? config.leftOn.trim() : '';
    const rightOn = typeof config.rightOn === 'string' ? config.rightOn.trim() : '';
    const how = parseHow(config);
    const suffixes = parseSuffixes(config);

    return `${outputVar} = ${left}.merge(${right}, left_on=${JSON.stringify(leftOn)}, right_on=${JSON.stringify(rightOn)}, how=${JSON.stringify(how)}, suffixes=${JSON.stringify(suffixes)})`;
  },

  inspectorSchema() {
    return [
      { kind: 'column', key: 'leftOn', label: 'Left key', schemaIndex: 0 },
      { kind: 'column', key: 'rightOn', label: 'Right key', schemaIndex: 1 },
      { kind: 'select', key: 'how', label: 'Join type', options: ['inner', 'left', 'right', 'outer'] },
    ];
  },

  configSummary(config) {
    const leftOn = typeof config.leftOn === 'string' ? config.leftOn : '';
    const rightOn = typeof config.rightOn === 'string' ? config.rightOn : '';
    const how = parseHow(config);
    if (!leftOn && !rightOn) return 'No join keys';
    return `${leftOn} = ${rightOn} (${how})`;
  },
};
