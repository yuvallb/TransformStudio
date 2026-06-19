import { kernelClient } from '@/engine/kernel-client';

function triggerBlobDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadNodeOutput(
  nodeId: string,
  format: 'csv' | 'json',
  filename: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await kernelClient.exportNodeOutput(nodeId, format);

  if (result.error || result.data === undefined) {
    return { ok: false, message: result.error?.message ?? 'Export failed' };
  }

  const mime =
    format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
  const safeName = filename.trim() || `pipeline_output.${format}`;
  triggerBlobDownload(result.data, safeName, mime);
  return { ok: true };
}
