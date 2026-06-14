import type { NodeDefinition } from './types';

function readCsvArgs(config: Record<string, unknown>, mode: 'execution' | 'export'): string {
  const delimiter = typeof config.delimiter === 'string' ? config.delimiter : ',';
  const header = config.header !== false;
  const encoding = typeof config.encoding === 'string' ? config.encoding : 'utf-8';

  const parts = [
    `sep=${JSON.stringify(delimiter)}`,
    header ? 'header=0' : 'header=None',
    `encoding=${JSON.stringify(encoding)}`,
  ];

  if (mode === 'export') {
    const filename = typeof config.filename === 'string' ? config.filename : 'data.csv';
    return `${JSON.stringify(filename)}, ${parts.join(', ')}`;
  }

  return parts.join(', ');
}

export const sourceCsv: NodeDefinition = {
  type: 'source.csv',
  label: 'CSV Source',
  category: 'source',
  inputs: [],
  outputs: 1,

  defaultConfig() {
    return {
      filename: '',
      delimiter: ',',
      header: true,
      encoding: 'utf-8',
    };
  },

  validate(config) {
    if (!config.filename || typeof config.filename !== 'string') {
      return [{ field: 'filename', message: 'Import a CSV file first' }];
    }
    return [];
  },

  compile(config, _inputVars, outputVar, _params, context) {
    const mode = context?.mode ?? 'execution';
    if (mode === 'export') {
      return `${outputVar} = pd.read_csv(${readCsvArgs(config, 'export')})`;
    }
    return `${outputVar} = pd.read_csv('/tmp/${outputVar}.csv', ${readCsvArgs(config, 'execution')})`;
  },

  inspectorSchema() {
    return [
      { kind: 'text', key: 'filename', label: 'Filename' },
      { kind: 'text', key: 'delimiter', label: 'Delimiter' },
      { kind: 'select', key: 'header', label: 'Header row', options: ['true', 'false'] },
      { kind: 'text', key: 'encoding', label: 'Encoding' },
    ];
  },

  configSummary(config) {
    const filename = typeof config.filename === 'string' ? config.filename : 'No file';
    return filename || 'No file';
  },
};
