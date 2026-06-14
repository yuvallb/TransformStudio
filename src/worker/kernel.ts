import type { PyodideInterface } from 'pyodide';

import type {
  ExecutePipelineRequest,
  ExecutePipelineResult,
  NodeRuntimeState,
  PreviewPayload,
  StructuredError,
} from '@/lib/types';
import { normalizePreviewColumns } from '@/lib/utils';

function parsePythonException(err: unknown, nodeId?: string): StructuredError {
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const message =
      typeof record.message === 'string'
        ? record.message
        : err instanceof Error
          ? err.message
          : String(err);
    const traceback = typeof record.traceback === 'string' ? record.traceback : undefined;
    return { message, traceback, nodeId };
  }

  return { message: String(err), nodeId };
}

function toPreviewPayload(raw: unknown): PreviewPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const columns = Array.isArray(record.columns)
    ? normalizePreviewColumns(
        record.columns as { name: string; dtype: string; nullable: boolean }[],
      )
    : [];
  const rows = Array.isArray(record.rows) ? (record.rows as Record<string, unknown>[]) : [];

  return {
    columns,
    rows,
    totalRows: typeof record.totalRows === 'number' ? record.totalRows : rows.length,
    totalColumns: typeof record.totalColumns === 'number' ? record.totalColumns : columns.length,
  };
}

function buildReadCsvArgs(options: ExecutePipelineRequest['nodes'][0]['csvOptions']): string {
  if (!options) return '';
  const parts: string[] = [];
  if (options.delimiter !== undefined) parts.push(`sep=${JSON.stringify(options.delimiter)}`);
  if (options.header !== undefined) parts.push(options.header ? 'header=0' : 'header=None');
  if (options.encoding !== undefined) parts.push(`encoding=${JSON.stringify(options.encoding)}`);
  return parts.length > 0 ? `, ${parts.join(', ')}` : '';
}

export async function executePipeline(
  pyodide: PyodideInterface,
  request: ExecutePipelineRequest,
): Promise<ExecutePipelineResult> {
  const nodeResults: Record<string, NodeRuntimeState> = {};

  for (const nodeId of request.deleteNodeIds ?? []) {
    try {
      pyodide.runPython(`
import gc
_var_name = "node_${nodeId}"
if _var_name in globals():
    del globals()[_var_name]
gc.collect()
`);
    } catch (err) {
      return { nodeResults, error: parsePythonException(err, nodeId) };
    }
  }

  pyodide.globals.set('params', request.params);

  for (const node of request.nodes) {
    if (!node.isStale) continue;

    const varName = `node_${node.nodeId}`;

    try {
      if (node.csvBytes) {
        pyodide.FS.writeFile(`/tmp/${varName}.csv`, node.csvBytes);
      }

      pyodide.runPython(node.code);
      const previewRaw = pyodide.runPython(`preview_df(${varName})`);
      const preview = toPreviewPayload(
        previewRaw && typeof previewRaw === 'object' && 'toJs' in previewRaw
          ? (previewRaw as { toJs: (opts?: object) => unknown }).toJs({
              dict_converter: Object.fromEntries,
              create_proxies: false,
            })
          : previewRaw,
      );

      nodeResults[node.nodeId] = {
        nodeId: node.nodeId,
        status: 'success',
        fingerprint: null,
        preview,
        error: null,
      };
    } catch (err) {
      nodeResults[node.nodeId] = {
        nodeId: node.nodeId,
        status: 'error',
        fingerprint: null,
        preview: null,
        error: parsePythonException(err, node.nodeId).message,
      };
      return { nodeResults, error: parsePythonException(err, node.nodeId) };
    }
  }

  return { nodeResults };
}

export { buildReadCsvArgs };
