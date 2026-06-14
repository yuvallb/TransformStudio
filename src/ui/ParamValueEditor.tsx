import type { WorkflowParam } from '@/lib/types';
import { Input } from '@/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';

interface ParamValueEditorProps {
  param: WorkflowParam;
  value: unknown;
  onChange: (value: unknown) => void;
  id?: string;
}

export function ParamValueEditor({ param, value, onChange, id }: ParamValueEditorProps) {
  const ariaLabel = `${param.label ?? param.name} value`;

  switch (param.type) {
    case 'string':
      return (
        <Input
          id={id}
          aria-label={ariaLabel}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs"
        />
      );
    case 'number':
      return (
        <Input
          id={id}
          type="number"
          value={String(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="text-xs"
        />
      );
    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs"
        />
      );
    case 'enum': {
      const options = param.options ?? [];
      const selected = String(value ?? options[0] ?? '');
      return (
        <Select value={selected} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={id} className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-xs">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="size-3.5 rounded border-border"
          />
          <span>{value ? 'true' : 'false'}</span>
        </label>
      );
  }
}
