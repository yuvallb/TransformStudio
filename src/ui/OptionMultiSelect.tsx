import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';

export interface OptionMultiSelectItem {
  value: string;
  label: string;
}

interface OptionMultiSelectProps {
  options: OptionMultiSelectItem[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function OptionMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options',
  disabled = false,
}: OptionMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query),
    );
  }, [options, search]);

  const labelByValue = useMemo(
    () => new Map(options.map((opt) => [opt.value, opt.label])),
    [options],
  );

  const toggleOption = (optionValue: string) => {
    if (selected.includes(optionValue)) {
      onChange(selected.filter((item) => item !== optionValue));
      return;
    }
    onChange([...selected, optionValue]);
  };

  const displayLabel =
    selected.length > 0
      ? selected.map((item) => labelByValue.get(item) ?? item).join(', ')
      : placeholder;

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
            placeholder="Search…"
            className="mb-2 h-7 text-xs"
          />
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">No options</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted',
                      isSelected && 'bg-muted',
                    )}
                  >
                    <Check className={cn('size-3', isSelected ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1 truncate">{opt.label}</span>
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
