import type { NodeDefinition, ValidateContext } from './types';

function parseAxis(config: Record<string, unknown>): 0 | 1 {
  return config.axis === 1 ? 1 : 0;
}

export const concat: NodeDefinition = {
  type: 'concat',
  label: 'Concat',
  category: 'transform',
  inputs: [
    { id: 'input1', label: 'Input 1' },
    { id: 'input2', label: 'Input 2' },
  ],
  outputs: 1,

  defaultConfig() {
    return { axis: 0 as 0 | 1 };
  },

  validate(config, inputSchemas, context?: ValidateContext) {
    const errors = [];
    const axis = parseAxis(config);

    if (context?.inputVarCount !== undefined && context.inputVarCount < 2) {
      errors.push({ field: 'inputs', message: 'Connect both inputs' });
    }

    const rowCounts = context?.inputRowCounts;
    if (axis === 1 && rowCounts?.length === 2 && rowCounts[0] !== rowCounts[1]) {
      errors.push({
        field: 'axis',
        message: 'Row counts differ between inputs (column concat requires matching rows)',
      });
    }

    return errors;
  },

  compile(config, inputVars, outputVar) {
    const axis = parseAxis(config);
    const inputs = inputVars.map((v) => v).join(', ');
    return `${outputVar} = pd.concat([${inputs}], axis=${axis})`;
  },

  inspectorSchema() {
    return [{ kind: 'select', key: 'axis', label: 'Axis', options: ['0', '1'] }];
  },

  configSummary(config) {
    const axis = parseAxis(config);
    return axis === 0 ? 'Stack rows (axis=0)' : 'Side by side (axis=1)';
  },
};
