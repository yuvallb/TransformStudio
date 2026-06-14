import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { getNodeDefinition } from '@/nodes/registry';
import type { WorkflowNode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRuntimeStore } from '@/state/runtime-store';
import { useWorkflowStore } from '@/state/workflow-store';

export interface TransformNodeData {
  workflowNode: WorkflowNode;
  [key: string]: unknown;
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
  const preview = runtime?.preview;
  const status = runtime?.status ?? 'idle';

  const summary = useMemo(() => def.configSummary(workflowNode.config), [def, workflowNode.config]);

  const rowColText = preview
    ? `${preview.totalRows.toLocaleString()} rows × ${preview.totalColumns} cols`
    : 'No preview';

  const showInput = def.inputs.length > 0;

  return (
    <div
      className={cn(
        'min-w-[180px] rounded-lg border-2 bg-card shadow-sm transition-colors',
        statusBorder(status, isStale && status !== 'success'),
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      {showInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!z-10 !h-3 !w-3 !bg-primary"
        />
      )}

      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-semibold text-foreground">{def.label}</p>
        {workflowNode.title && (
          <p className="text-[10px] text-muted-foreground">{workflowNode.title}</p>
        )}
      </div>

      <div className="px-3 py-2">
        <p className="truncate text-xs text-muted-foreground">{summary}</p>
      </div>

      <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5">
        <StatusIcon status={status} isStale={isStale} />
        <span className="text-[10px] text-muted-foreground">{rowColText}</span>
      </div>

      <Handle type="source" position={Position.Right} className="!z-10 !h-3 !w-3 !bg-primary" />
    </div>
  );
});
