import type { NodeDefinition } from './types';

export const output: NodeDefinition = {
  type: 'output',
  label: 'Output',
  category: 'output',
  inputs: [{ id: 'input', label: 'Input' }],
  outputs: 1,

  defaultConfig() {
    return {
      format: 'csv' as const,
      filename: 'pipeline_output.csv',
    };
  },

  validate(config) {
    const format = config.format;
    if (format !== 'csv' && format !== 'json') {
      return [{ field: 'format', message: 'Format must be csv or json' }];
    }
    return [];
  },

  compile(config, inputVars, outputVar, _params, context) {
    const input = inputVars[0];
    const mode = context?.mode ?? 'execution';
    const format = config.format === 'json' ? 'json' : 'csv';
    const filename =
      typeof config.filename === 'string' ? config.filename : `pipeline_output.${format}`;

    if (mode === 'execution') {
      return `${outputVar} = ${input}`;
    }

    if (format === 'json') {
      return `${outputVar} = ${input}\n${outputVar}.to_json(${JSON.stringify(filename)}, orient='records', indent=2)`;
    }

    return `${outputVar} = ${input}\n${outputVar}.to_csv(${JSON.stringify(filename)}, index=False)`;
  },

  inspectorSchema() {
    return [
      { kind: 'select', key: 'format', label: 'Format', options: ['csv', 'json'] },
      { kind: 'text', key: 'filename', label: 'Filename' },
    ];
  },

  configSummary(config) {
    const format = config.format === 'json' ? 'JSON' : 'CSV';
    const filename = typeof config.filename === 'string' ? config.filename : 'output';
    return `${format} → ${filename}`;
  },
};
