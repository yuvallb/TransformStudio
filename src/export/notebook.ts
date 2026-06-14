import {
  compileNodeExportCode,
  getNodeMarkdown,
  getSetupLines,
  getSortedPipelineNodes,
  type PipelineWorkflow,
} from '@/engine/codegen';
import { getNodeDefinition } from '@/nodes/registry';

export interface NotebookCell {
  cell_type: 'markdown' | 'code';
  metadata: Record<string, unknown>;
  source: string[];
  execution_count?: null;
  outputs?: unknown[];
}

export interface Notebook {
  nbformat: 4;
  nbformat_minor: 5;
  metadata: {
    kernelspec: { name: string; display_name: string };
    language_info: { name: string; version: string };
  };
  cells: NotebookCell[];
}

function toNbSource(text: string): string[] {
  if (!text) return [];
  const lines = text.split('\n');
  return lines.map((line) => `${line}\n`);
}

export function generateNotebook(workflow: PipelineWorkflow): Notebook {
  const setup = getSetupLines(workflow).join('\n').trimEnd();
  const cells: NotebookCell[] = [
    {
      cell_type: 'code',
      metadata: {},
      execution_count: null,
      outputs: [],
      source: toNbSource(setup),
    },
  ];

  for (const node of getSortedPipelineNodes(workflow)) {
    const def = getNodeDefinition(node.type);
    cells.push({
      cell_type: 'markdown',
      metadata: {},
      source: toNbSource(getNodeMarkdown(node, def)),
    });
    cells.push({
      cell_type: 'code',
      metadata: {},
      execution_count: null,
      outputs: [],
      source: toNbSource(compileNodeExportCode(node, workflow)),
    });
  }

  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { name: 'python3', display_name: 'Python 3' },
      language_info: { name: 'python', version: '3.11.0' },
    },
    cells,
  };
}

export function downloadNotebook(
  workflow: PipelineWorkflow,
  filename = 'pipeline.ipynb',
): void {
  const notebook = generateNotebook(workflow);
  const content = JSON.stringify(notebook, null, 2);
  const blob = new Blob([content], { type: 'application/x-ipynb+json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
