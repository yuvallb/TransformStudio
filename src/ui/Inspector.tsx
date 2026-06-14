import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { getUpstreamSchemasForNode, getValidateContext } from '@/engine/pipeline';
import { getNodeDefinition } from '@/nodes/registry';
import type { InspectorField } from '@/nodes/types';
import { useRuntimeStore } from '@/state/runtime-store';
import { useWorkflowStore } from '@/state/workflow-store';
import { ColumnPicker } from '@/ui/ColumnPicker';
import { ExpressionInput } from '@/ui/ExpressionInput';
import { Input } from '@/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';

const DTYPE_OPTIONS = ['int64', 'float64', 'str', 'bool', 'datetime64[ns]', 'category'];

export function Inspector() {
  const workflow = useWorkflowStore((s) => s.workflow);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const byNodeId = useRuntimeStore((s) => s.byNodeId);

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId);
  const runtime = selectedNodeId ? byNodeId.get(selectedNodeId) : null;

  const upstreamSchemas = useMemo(
    () => (selectedNode ? getUpstreamSchemasForNode(selectedNode, workflow, byNodeId) : []),
    [selectedNode, workflow, byNodeId],
  );

  const validationErrors = useMemo(() => {
    if (!selectedNode) return [];
    const def = getNodeDefinition(selectedNode.type);
    const context = getValidateContext(selectedNode, workflow, byNodeId, def.inputs);
    return def.validate(selectedNode.config, upstreamSchemas, context);
  }, [selectedNode, upstreamSchemas, workflow, byNodeId]);

  const errorsByField = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const err of validationErrors) {
      const key = err.field ?? '_global';
      const list = map.get(key) ?? [];
      list.push(err.message);
      map.set(key, list);
    }
    return map;
  }, [validationErrors]);

  useEffect(() => {
    if (!selectedNode || selectedNode.type !== 'groupby') return;
    const schema = upstreamSchemas[0] ?? [];
    if (schema.length === 0) return;

    const aggregations = Array.isArray(selectedNode.config.aggregations)
      ? (selectedNode.config.aggregations as { column: string; func: string }[])
      : [];
    if (aggregations.length === 0) return;

    const needsFill = aggregations.some((agg) => !agg.column);
    if (!needsFill) return;

    updateNodeConfig(selectedNode.id, {
      aggregations: aggregations.map((agg) =>
        agg.column ? agg : { ...agg, column: schema[0].name },
      ),
    });
  }, [selectedNode, upstreamSchemas, updateNodeConfig]);

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

      {(errorsByField.get('_global') ?? []).map((message) => (
        <div
          key={message}
          className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-xs text-amber-700"
        >
          {message}
        </div>
      ))}

      {def.inspectorSchema().map((field) => (
        <InspectorFieldRenderer
          key={field.key}
          field={field}
          config={config}
          upstreamSchemas={upstreamSchemas}
          errors={errorsByField.get(field.key) ?? []}
          onUpdate={update}
          workflowParamNames={workflow.params.map((p) => p.name)}
        />
      ))}

      {def.inputs.length > 0 && <InputPreviewSection nodeId={selectedNode.id} workflow={workflow} />}
    </div>
  );
}

function InspectorFieldRenderer({
  field,
  config,
  upstreamSchemas,
  errors,
  onUpdate,
  workflowParamNames,
}: {
  field: InspectorField;
  config: Record<string, unknown>;
  upstreamSchemas: ReturnType<typeof getUpstreamSchemasForNode>;
  errors: string[];
  onUpdate: (key: string, value: unknown) => void;
  workflowParamNames: string[];
}) {
  const schemaIndex = 'schemaIndex' in field ? (field.schemaIndex ?? 0) : 0;
  const schema = upstreamSchemas[schemaIndex] ?? [];

  const renderField = () => {
    switch (field.kind) {
      case 'text': {
        const readOnly = field.key === 'filename';
        return (
          <Input
            value={String(config[field.key] ?? '')}
            readOnly={readOnly}
            onChange={(e) => onUpdate(field.key, e.target.value)}
            className="text-xs"
          />
        );
      }
      case 'number':
        return (
          <Input
            type="number"
            value={String(config[field.key] ?? '')}
            onChange={(e) => onUpdate(field.key, Number(e.target.value))}
            className="text-xs"
          />
        );
      case 'select': {
        const raw = config[field.key];
        const value =
          field.key === 'header'
            ? raw !== false
              ? 'true'
              : 'false'
            : String(raw ?? field.options[0] ?? '');
        return (
          <Select value={value} onValueChange={(v) => {
            if (field.key === 'header') {
              onUpdate(field.key, v === 'true');
            } else if (field.key === 'axis') {
              onUpdate(field.key, Number(v));
            } else {
              onUpdate(field.key, v);
            }
          }}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'column':
        return (
          <ColumnPicker
            columns={schema}
            value={typeof config[field.key] === 'string' ? (config[field.key] as string) : ''}
            onChange={(v) => onUpdate(field.key, v)}
          />
        );
      case 'columns':
        return (
          <ColumnPicker
            columns={schema}
            multiple
            value={Array.isArray(config[field.key]) ? (config[field.key] as string[]) : []}
            onChange={(v) => onUpdate(field.key, v)}
          />
        );
      case 'expression':
        return (
          <ExpressionInput
            value={String(config[field.key] ?? '')}
            onChange={(v) => onUpdate(field.key, v)}
            workflowParamNames={workflowParamNames}
          />
        );
      case 'mapping':
        return (
          <MappingEditor
            mapping={
              config[field.key] && typeof config[field.key] === 'object'
                ? (config[field.key] as Record<string, string>)
                : {}
            }
            columns={schema.map((c) => c.name)}
            onChange={(m) => onUpdate(field.key, m)}
          />
        );
      case 'dtype-mapping':
        return (
          <DtypeMappingEditor
            mapping={
              config[field.key] && typeof config[field.key] === 'object'
                ? (config[field.key] as Record<string, string>)
                : {}
            }
            columns={schema.map((c) => c.name)}
            onChange={(m) => onUpdate(field.key, m)}
          />
        );
      case 'aggregations':
        return (
          <GroupByAggregations
            aggregations={
              Array.isArray(config.aggregations)
                ? (config.aggregations as { column: string; func: string }[])
                : []
            }
            onChange={(aggs) => onUpdate('aggregations', aggs)}
            upstreamColumns={schema.map((c) => c.name)}
          />
        );
      case 'param-ref':
        return (
          <Input value="" disabled placeholder="Parameters (M5)" className="text-xs opacity-50" />
        );
      default: {
        console.warn(`Unknown inspector field kind: ${(field as InspectorField).kind}`);
        return null;
      }
    }
  };

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-foreground">{field.label}</span>
      {renderField()}
      {errors.map((message) => (
        <span key={message} className="text-[10px] text-amber-700">
          {message}
        </span>
      ))}
    </label>
  );
}

function MappingEditor({
  mapping,
  columns,
  onChange,
}: {
  mapping: Record<string, string>;
  columns: string[];
  onChange: (mapping: Record<string, string>) => void;
}) {
  const entries = Object.entries(mapping);

  const updateEntry = (index: number, from: string, to: string) => {
    const next = { ...mapping };
    const oldKey = entries[index]?.[0];
    if (oldKey && oldKey !== from) delete next[oldKey];
    if (from) next[from] = to;
    onChange(next);
  };

  const addEntry = () => {
    const from = columns.find((c) => !(c in mapping)) ?? '';
    onChange({ ...mapping, [from]: '' });
  };

  const removeEntry = (key: string) => {
    const next = { ...mapping };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([from, to], i) => (
        <div key={`${from}-${i}`} className="flex gap-1">
          <Select value={from} onValueChange={(v) => updateEntry(i, v, to)}>
            <SelectTrigger className="flex-1 text-xs">
              <SelectValue placeholder="Column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={to}
            onChange={(e) => updateEntry(i, from, e.target.value)}
            placeholder="New name"
            className="flex-1 text-xs"
          />
          <button
            type="button"
            onClick={() => removeEntry(from)}
            className="px-1 text-xs text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={addEntry} className="text-xs text-primary hover:underline">
        + Add rename
      </button>
    </div>
  );
}

function DtypeMappingEditor({
  mapping,
  columns,
  onChange,
}: {
  mapping: Record<string, string>;
  columns: string[];
  onChange: (mapping: Record<string, string>) => void;
}) {
  const entries = Object.entries(mapping);

  const updateEntry = (index: number, col: string, dtype: string) => {
    const next = { ...mapping };
    const oldKey = entries[index]?.[0];
    if (oldKey && oldKey !== col) delete next[oldKey];
    if (col) next[col] = dtype;
    onChange(next);
  };

  const addEntry = () => {
    const col = columns.find((c) => !(c in mapping)) ?? '';
    onChange({ ...mapping, [col]: 'str' });
  };

  const removeEntry = (key: string) => {
    const next = { ...mapping };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([col, dtype], i) => (
        <div key={`${col}-${i}`} className="flex gap-1">
          <Select value={col} onValueChange={(v) => updateEntry(i, v, dtype)}>
            <SelectTrigger className="flex-1 text-xs">
              <SelectValue placeholder="Column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dtype} onValueChange={(v) => updateEntry(i, col, v)}>
            <SelectTrigger className="w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DTYPE_OPTIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => removeEntry(col)}
            className="px-1 text-xs text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={addEntry} className="text-xs text-primary hover:underline">
        + Add cast
      </button>
    </div>
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
      {aggregations.map((agg, i) => (
        <div key={i} className="flex gap-2">
          <Select value={agg.column} onValueChange={(v) => updateAgg(i, 'column', v)}>
            <SelectTrigger className="flex-1 text-xs">
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
            <SelectTrigger className="w-24 text-xs">
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
      <button type="button" onClick={addAgg} className="text-xs text-primary hover:underline">
        + Add aggregation
      </button>
    </div>
  );
}

function InputPreviewSection({
  nodeId,
  workflow,
}: {
  nodeId: string;
  workflow: ReturnType<typeof useWorkflowStore.getState>['workflow'];
}) {
  const [open, setOpen] = useState(false);
  const byNodeId = useRuntimeStore((s) => s.byNodeId);

  const upstreamEdges = workflow.edges.filter((e) => e.target === nodeId);
  if (upstreamEdges.length === 0) return null;

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 text-xs font-medium text-foreground"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        Input preview
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-3">
          {upstreamEdges.map((edge) => {
            const upstream = workflow.nodes.find((n) => n.id === edge.source);
            const preview = byNodeId.get(edge.source)?.preview;
            if (!upstream) return null;
            return (
              <div key={edge.id} className="rounded-md border border-border p-2">
                <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                  {upstream.id}
                  {edge.targetHandle ? ` (${edge.targetHandle})` : ''}
                </p>
                {preview && preview.rows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr>
                          {preview.columns.map((col) => (
                            <th key={col.name} className="px-1 text-left font-medium">
                              {col.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {preview.columns.map((col) => (
                              <td key={col.name} className="px-1 text-muted-foreground">
                                {String(row[col.name] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No preview available</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
