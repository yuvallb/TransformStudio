import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { getNodeDefinition } from '@/nodes/registry';
import type { WorkflowNode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getNodeDiffStatus } from '@/versioning/diff';
import { useRuntimeStore } from '@/state/runtime-store';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';

export interface TransformNodeData {
  workflowNode: WorkflowNode;
  isGhost?: boolean;
  [key: string]: unknown;
}

function diffBorder(status: ReturnType<typeof getNodeDiffStatus>): string | null {
  if (status === 'added') return 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30';
  if (status === 'removed') return 'border-red-500 border-dashed bg-red-50/50 dark:bg-red-950/30';
  if (status === 'modified') return 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30';
  if (status === 'unchanged') return 'border-border opacity-60';
  return null;
}

function statusBorder(status: string | undefined, isStale: boolean): string {
  if (status === 'error') return 'border-red-500';
  if (status === 'running') return 'border-amber-400 animate-pulse';
  if (isStale || status === 'stale') return 'border-amber-500';
  if (status === 'success') return 'border-emerald-500';
  return 'border-border';
}

function StatusIcon({ status, isStale }: { status?: string; isStale: boolean }) {
  if (status === 'error') return <AlertCircle className="size-3.5 text-red-500" />;
  if (status === 'running') return <Loader2 className="size-3.5 animate-spin text-amber-500" />;
  if (isStale) return <Loader2 className="size-3.5 text-amber-500" />;
  if (status === 'success') return <CheckCircle2 className="size-3.5 text-emerald-500" />;
  return null;
}

export const NodeRenderer = memo(function NodeRenderer({ data, selected }: NodeProps) {
  const nodeData = data as TransformNodeData;
  const workflowNode = nodeData.workflowNode;
  const def = getNodeDefinition(workflowNode.type);
  const runtime = useRuntimeStore((s) => s.byNodeId.get(workflowNode.id));
  const isStale = useWorkflowStore((s) => s.staleNodeIds.has(workflowNode.id));
  const compareMode = useUiStore((s) => s.compareMode);
  const isSharedImport = useUiStore((s) => s.isSharedImport);
  const hasDataset = useWorkflowStore((s) => Boolean(s.datasets[workflowNode.id]));
  const diffStatus = compareMode
    ? getNodeDiffStatus(workflowNode.id, compareMode.diff)
    : null;
  const isGhost = Boolean(nodeData.isGhost);
  const preview = runtime?.preview;
  const status = runtime?.status ?? 'idle';

  const summary = useMemo(() => def.configSummary(workflowNode.config), [def, workflowNode.config]);

  const rowColText = preview
    ? `${preview.totalRows.toLocaleString()} rows × ${preview.totalColumns} cols`
    : 'No preview';

  const showImportPlaceholder =
    isSharedImport && def.category === 'source' && !hasDataset && !isGhost;

  const showInput = def.inputs.length > 0;

  const borderClass = diffStatus
    ? diffBorder(diffStatus)
    : statusBorder(status, isStale && status !== 'success');

  return (
    <div
      className={cn(
        'min-w-[180px] rounded-lg border-2 bg-card shadow-sm transition-colors',
        borderClass,
        selected && !diffStatus && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        isGhost && 'pointer-events-none opacity-80',
      )}
    >
      {showInput &&
        (def.inputs.length > 1 ? (
          def.inputs.map((port, index) => (
            <Handle
              key={port.id}
              type="target"
              position={Position.Left}
              id={port.id}
              style={{ top: `${((index + 1) / (def.inputs.length + 1)) * 100}%` }}
              className="!z-10 !h-3 !w-3 !bg-primary"
              title={port.label}
            />
          ))
        ) : (
          <Handle
            type="target"
            position={Position.Left}
            id={def.inputs[0]?.id ?? 'input'}
            className="!z-10 !h-3 !w-3 !bg-primary"
          />
        ))}

      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-semibold text-foreground">{def.label}</p>
        {workflowNode.title && (
          <p className="text-[10px] text-muted-foreground">{workflowNode.title}</p>
        )}
      </div>

      <div className="px-3 py-2">
        {showImportPlaceholder ? (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Import your dataset
          </p>
        ) : (
          <p className="truncate text-xs text-muted-foreground">{summary}</p>
        )}
        {status === 'error' && runtime?.error && (
          <p className="mt-1 line-clamp-2 text-[10px] text-red-600">{runtime.error}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5">
        <StatusIcon status={status} isStale={isStale} />
        <span className="text-[10px] text-muted-foreground">{rowColText}</span>
      </div>

      <Handle type="source" position={Position.Right} className="!z-10 !h-3 !w-3 !bg-primary" />
    </div>
  );
});
