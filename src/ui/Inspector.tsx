import { useMemo } from 'react';

import { getUpstreamSchemas } from '@/engine/pipeline';
import { getNodeDefinition } from '@/nodes/registry';
import { Input } from '@/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';
import { useRuntimeStore } from '@/state/runtime-store';
import { useWorkflowStore } from '@/state/workflow-store';

export function Inspector() {
  const workflow = useWorkflowStore((s) => s.workflow);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const byNodeId = useRuntimeStore((s) => s.byNodeId);

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId);
  const runtime = selectedNodeId ? byNodeId.get(selectedNodeId) : null;

  const validationErrors = useMemo(() => {
    if (!selectedNode) return [];
    const def = getNodeDefinition(selectedNode.type);
    const inputSchemas = getUpstreamSchemas(selectedNode, workflow, byNodeId);
    return def.validate(selectedNode.config, inputSchemas);
  }, [selectedNode, workflow, byNodeId]);

  if (!selectedNode) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        Select a node to edit its configuration
      </div>
    );
  }

  const def = getNodeDefinition(selectedNode.type);
  const config = selectedNode.config;

  const update = (key: string, value: unknown) => {
    updateNodeConfig(selectedNode.id, { [key]: value });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h3 className="text-sm font-semibold">{def.label}</h3>
        <p className="text-xs text-muted-foreground">Node ID: {selectedNode.id}</p>
      </div>

      {runtime?.error && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-600">
          {runtime.error}
        </div>
      )}

      {validationErrors.map((err) => (
        <div
          key={`${err.field}-${err.message}`}
          className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-xs text-amber-700"
        >
          {err.message}
        </div>
      ))}

      {selectedNode.type === 'source.csv' && (
        <>
          <Field label="Filename">
            <Input value={String(config.filename ?? '')} readOnly placeholder="Drop a CSV file" />
          </Field>
          <Field label="Delimiter">
            <Input
              value={String(config.delimiter ?? ',')}
              onChange={(e) => update('delimiter', e.target.value)}
            />
          </Field>
          <Field label="Header row">
            <Select
              value={config.header !== false ? 'true' : 'false'}
              onValueChange={(v) => update('header', v === 'true')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      )}

      {selectedNode.type === 'filter' && (
        <Field label="Filter expression">
          <Input
            value={String(config.expression ?? '')}
            onChange={(e) => update('expression', e.target.value)}
            placeholder='e.g. df["revenue"] > 1000 or revenue > 1000'
            className="font-mono text-xs"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Use column names directly (revenue &gt; 1000) or bracket notation
          </p>
        </Field>
      )}

      {selectedNode.type === 'groupby' && (
        <>
          <Field label="Group columns (comma-separated)">
            <Input
              value={Array.isArray(config.groupColumns) ? config.groupColumns.join(', ') : ''}
              onChange={(e) =>
                update(
                  'groupColumns',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              placeholder="region, country"
            />
          </Field>
          <GroupByAggregations
            aggregations={
              Array.isArray(config.aggregations)
                ? (config.aggregations as { column: string; func: string }[])
                : []
            }
            onChange={(aggs) => update('aggregations', aggs)}
            upstreamColumns={
              getUpstreamSchemas(selectedNode, workflow, byNodeId)[0]?.map((c) => c.name) ?? []
            }
          />
        </>
      )}

      {selectedNode.type === 'output' && (
        <>
          <Field label="Format">
            <Select
              value={config.format === 'json' ? 'json' : 'csv'}
              onValueChange={(v) => update('format', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Filename">
            <Input
              value={String(config.filename ?? '')}
              onChange={(e) => update('filename', e.target.value)}
            />
          </Field>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function GroupByAggregations({
  aggregations,
  onChange,
  upstreamColumns,
}: {
  aggregations: { column: string; func: string }[];
  onChange: (aggs: { column: string; func: string }[]) => void;
  upstreamColumns: string[];
}) {
  const updateAgg = (index: number, field: 'column' | 'func', value: string) => {
    const next = [...aggregations];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const addAgg = () => {
    onChange([...aggregations, { column: upstreamColumns[0] ?? '', func: 'sum' }]);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium">Aggregations</span>
      {aggregations.map((agg, i) => (
        <div key={i} className="flex gap-2">
          <Select value={agg.column} onValueChange={(v) => updateAgg(i, 'column', v)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Column" />
            </SelectTrigger>
            <SelectContent>
              {upstreamColumns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={agg.func} onValueChange={(v) => updateAgg(i, 'func', v)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['sum', 'mean', 'count', 'min', 'max'].map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      <button
        type="button"
        onClick={addAgg}
        className="text-xs text-primary hover:underline"
      >
        + Add aggregation
      </button>
    </div>
  );
}
