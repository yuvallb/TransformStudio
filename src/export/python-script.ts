import { generatePipelineCode } from '@/engine/codegen';

export function downloadPythonScript(
  workflow: Parameters<typeof generatePipelineCode>[0],
  filename = 'pipeline.py',
): void {
  const content = generatePipelineCode(workflow);
  const blob = new Blob([content], { type: 'text/x-python' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export { generatePipelineCode };
