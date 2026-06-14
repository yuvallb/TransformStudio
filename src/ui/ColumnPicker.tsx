import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import type { ColumnSchema } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';

const DTYPE_COLORS: Record<string, string> = {
  int: 'bg-blue-100 text-blue-800',
  float: 'bg-purple-100 text-purple-800',
  string: 'bg-green-100 text-green-800',
  bool: 'bg-amber-100 text-amber-800',
  datetime: 'bg-rose-100 text-rose-800',
  unknown: 'bg-gray-100 text-gray-800',
};

interface ColumnPickerProps {
  columns: ColumnSchema[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ColumnPicker({
  columns,
  value,
  onChange,
  multiple = false,
  placeholder = 'Select column',
  disabled = false,
}: ColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = useMemo(() => {
    if (multiple) return Array.isArray(value) ? value : [];
    return typeof value === 'string' && value ? [value] : [];
  }, [value, multiple]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return columns;
    return columns.filter((col) => col.name.toLowerCase().includes(query));
  }, [columns, search]);

  const toggleColumn = (name: string) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      if (current.includes(name)) {
        onChange(current.filter((c) => c !== name));
      } else {
        onChange([...current, name]);
      }
      return;
    }
    onChange(name);
    setOpen(false);
  };

  const displayLabel = multiple
    ? selected.length > 0
      ? selected.join(', ')
      : placeholder
    : selected[0] ?? placeholder;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className="h-8 w-full justify-between px-2 text-xs font-normal"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover p-2 shadow-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns…"
            className="mb-2 h-7 text-xs"
          />
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">No columns</p>
            ) : (
              filtered.map((col) => {
                const isSelected = selected.includes(col.name);
                return (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => toggleColumn(col.name)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted',
                      isSelected && 'bg-muted',
                    )}
                  >
                    <Check className={cn('size-3', isSelected ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1 truncate">{col.name}</span>
                    <span
                      className={cn(
                        'rounded px-1 py-0.5 text-[10px]',
                        DTYPE_COLORS[col.dtype] ?? DTYPE_COLORS.unknown,
                      )}
                    >
                      {col.dtype}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
