import type { PyodideInterface } from 'pyodide';

import { parsePythonException } from '@/engine/errors';
import type {
  ExecutePipelineRequest,
  ExecutePipelineResult,
  ColumnProfile,
  NodeRuntimeState,
  PreviewPayload,
} from '@/lib/types';
import { normalizePreviewColumns } from '@/lib/utils';

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

function toColumnProfiles(raw: unknown): ColumnProfile[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => {
    const record = item as Record<string, unknown>;
    const profile: ColumnProfile = {
      name: String(record.name ?? ''),
      dtype: String(record.dtype ?? 'unknown'),
      nullCount: typeof record.nullCount === 'number' ? record.nullCount : 0,
      nullPct: typeof record.nullPct === 'number' ? record.nullPct : 0,
      uniqueCount: typeof record.uniqueCount === 'number' ? record.uniqueCount : 0,
    };

    if (record.min !== undefined && record.min !== null) {
      profile.min = record.min as number | string;
    }
    if (record.max !== undefined && record.max !== null) {
      profile.max = record.max as number | string;
    }
    if (typeof record.mean === 'number') {
      profile.mean = record.mean;
    }
    if (Array.isArray(record.histogram)) {
      profile.histogram = record.histogram as ColumnProfile['histogram'];
    }
    if (record.topValues && typeof record.topValues === 'object') {
      profile.topValues = record.topValues as Record<string, number>;
    }

    return profile;
  });
}

function convertPyodideValue(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'toJs' in raw) {
    return (raw as { toJs: (opts?: object) => unknown }).toJs({
      dict_converter: Object.fromEntries,
      create_proxies: false,
    });
  }
  return raw;
}

function profileDataFrame(pyodide: PyodideInterface, varName: string): ColumnProfile[] {
  const profileRaw = pyodide.runPython(`profile_df(${varName})`);
  return toColumnProfiles(convertPyodideValue(profileRaw));
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
_var_name = "node_" + ${JSON.stringify(nodeId)}
if _var_name in globals():
    del globals()[_var_name]
gc.collect()
`);
    } catch (err) {
      return { nodeResults, error: parsePythonException(err, nodeId) };
    }
  }

  try {
    pyodide.runPython(`params = ${JSON.stringify(request.params)}`);
  } catch (err) {
    return { nodeResults, error: parsePythonException(err) };
  }

  for (const node of request.nodes) {
    if (!node.isStale) continue;

    const varName = `node_${node.nodeId}`;

    try {
      if (node.csvBytes) {
        pyodide.FS.writeFile(`/tmp/${varName}.csv`, node.csvBytes);
      }

      if (node.jsonBytes) {
        pyodide.FS.writeFile(`/tmp/${varName}.json`, node.jsonBytes);
      }

      pyodide.runPython(node.code);
      const previewRaw = pyodide.runPython(`preview_df(${varName})`);
      const preview = toPreviewPayload(convertPyodideValue(previewRaw));
      const profile = profileDataFrame(pyodide, varName);

      nodeResults[node.nodeId] = {
        nodeId: node.nodeId,
        status: 'success',
        fingerprint: null,
        preview,
        profile,
        error: null,
        traceback: null,
      };
    } catch (err) {
      const parsed = parsePythonException(err, node.nodeId);
      nodeResults[node.nodeId] = {
        nodeId: node.nodeId,
        status: 'error',
        fingerprint: null,
        preview: null,
        profile: null,
        error: parsed.message,
        traceback: parsed.traceback ?? null,
      };
      return { nodeResults, error: parsed };
    }
  }

  return { nodeResults };
}

export function profileNode(pyodide: PyodideInterface, nodeId: string): ColumnProfile[] {
  const varName = `node_${nodeId}`;
  const exists = pyodide.runPython(`"${varName}" in globals()`);
  if (!exists) {
    throw new Error(`Node output not found: ${nodeId}`);
  }
  return profileDataFrame(pyodide, varName);
}

export { buildReadCsvArgs };
