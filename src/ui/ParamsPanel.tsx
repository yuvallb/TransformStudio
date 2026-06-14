import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { defaultParamValue, validateParamName } from '@/lib/param-validation';
import type { WorkflowParam } from '@/lib/types';
import { useWorkflowStore } from '@/state/workflow-store';
import { ParamValueEditor } from '@/ui/ParamValueEditor';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';

const PARAM_TYPES: WorkflowParam['type'][] = ['string', 'number', 'date', 'enum', 'boolean'];

export function ParamsPanel() {
  const params = useWorkflowStore((s) => s.workflow.params);
  const addParam = useWorkflowStore((s) => s.addParam);
  const updateParam = useWorkflowStore((s) => s.updateParam);
  const removeParam = useWorkflowStore((s) => s.removeParam);

  const [adding, setAdding] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [draftType, setDraftType] = useState<WorkflowParam['type']>('string');
  const [draftDefault, setDraftDefault] = useState<unknown>('');
  const [draftOptions, setDraftOptions] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const resetDraft = () => {
    setDraftName('');
    setDraftLabel('');
    setDraftType('string');
    setDraftDefault('');
    setDraftOptions('');
    setNameError(null);
    setAdding(false);
    setEditingName(null);
  };

  const startAdd = () => {
    resetDraft();
    setAdding(true);
    setDraftDefault(defaultParamValue('string'));
  };

  const startEdit = (param: WorkflowParam) => {
    setAdding(false);
    setEditingName(param.name);
    setDraftName(param.name);
    setDraftLabel(param.label ?? '');
    setDraftType(param.type);
    setDraftDefault(param.default);
    setDraftOptions((param.options ?? []).join(', '));
    setNameError(null);
  };

  const handleTypeChange = (type: WorkflowParam['type']) => {
    setDraftType(type);
    const options = type === 'enum' ? draftOptions.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    setDraftDefault(defaultParamValue(type, options));
  };

  const parsedOptions =
    draftType === 'enum'
      ? draftOptions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

  const draftParam: WorkflowParam = {
    name: draftName,
    type: draftType,
    label: draftLabel || undefined,
    default: draftDefault,
    options: parsedOptions,
  };

  const saveNew = () => {
    const error = validateParamName(
      draftName,
      params.map((p) => p.name),
    );
    if (error) {
      setNameError(error);
      return;
    }

    const storeError = addParam({
      name: draftName.trim(),
      type: draftType,
      label: draftLabel || undefined,
      default: draftDefault,
      options: parsedOptions,
    });
    if (storeError) {
      setNameError(storeError);
      toast.error(storeError);
      return;
    }

    toast.success(`Parameter "${draftName.trim()}" added`);
    resetDraft();
  };

  const saveEdit = () => {
    if (!editingName) return;
    const storeError = updateParam(editingName, {
      type: draftType,
      label: draftLabel || undefined,
      default: draftDefault,
      options: parsedOptions,
    });
    if (storeError) {
      toast.error(storeError);
      return;
    }

    toast.success(`Parameter "${editingName}" updated`);
    resetDraft();
  };

  const showForm = adding || editingName !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Parameters
        </p>
        {params.length > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {params.length}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {params.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground">
            Reference parameters in expressions as {'{param_name}'}.
          </p>
        )}

        {params.map((param) =>
          editingName === param.name ? null : (
            <div
              key={param.name}
              className="flex items-start justify-between gap-2 rounded-md border border-border p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{param.label ?? param.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {param.name} · {param.type} · {String(param.default)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(param)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Edit ${param.name}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeParam(param.name);
                    toast.success(`Parameter "${param.name}" removed`);
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                  aria-label={`Remove ${param.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ),
        )}

        {showForm && (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2">
            {adding && (
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium">Name</span>
                <Input
                  value={draftName}
                  onChange={(e) => {
                    setDraftName(e.target.value);
                    setNameError(null);
                  }}
                  placeholder="country"
                  className="text-xs"
                />
                {nameError && <span className="text-[10px] text-red-600">{nameError}</span>}
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium">Label (optional)</span>
              <Input
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="Country code"
                className="text-xs"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium">Type</span>
              <Select value={draftType} onValueChange={(v) => handleTypeChange(v as WorkflowParam['type'])}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARAM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            {draftType === 'enum' && (
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium">Options (comma-separated)</span>
                <Input
                  value={draftOptions}
                  onChange={(e) => {
                    setDraftOptions(e.target.value);
                    const opts = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (opts.length > 0 && !opts.includes(String(draftDefault))) {
                      setDraftDefault(opts[0]);
                    }
                  }}
                  placeholder="US, UK, CA"
                  className="text-xs"
                />
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium">Default value</span>
              <ParamValueEditor
                param={draftParam}
                value={draftDefault}
                onChange={setDraftDefault}
              />
            </label>

            <div className="flex gap-2">
              <Button size="sm" className="h-7 flex-1 text-xs" onClick={adding ? saveNew : saveEdit}>
                {adding ? 'Add' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={resetDraft}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showForm && (
          <Button variant="outline" size="sm" className="h-7 w-full text-xs" onClick={startAdd}>
            <Plus className="mr-1 size-3.5" />
            Add parameter
          </Button>
        )}
      </div>
    </div>
  );
}
