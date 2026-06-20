import { useCallback, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';

import { kernelClient } from '@/engine/kernel-client';
import { cn } from '@/lib/utils';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  minHeight?: string;
}

export function CodeInput({
  value,
  onChange,
  placeholder = '# Input DataFrame is `inp`. Assign your result to `out`.',
  className,
  readOnly = false,
  minHeight = '160px',
}: CodeInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const valueRef = useRef(value);

  valueRef.current = value;

  const validate = useCallback(async (code: string) => {
    if (!code.trim()) {
      setError(null);
      return;
    }
    setValidating(true);
    try {
      const result = await kernelClient.validateCustomPython(code.trim());
      setError(result.valid ? null : (result.error ?? 'Invalid Python code'));
    } catch {
      setError('Validation failed');
    } finally {
      setValidating(false);
    }
  }, []);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <CodeMirror
        value={value}
        height={minHeight}
        extensions={[python()]}
        onChange={(next) => onChange(next)}
        onBlur={() => void validate(valueRef.current)}
        placeholder={placeholder}
        readOnly={readOnly}
        editable={!readOnly}
        basicSetup={{ lineNumbers: true, foldGutter: false }}
        className={cn(
          'overflow-hidden rounded-md border text-xs',
          error ? 'border-red-500' : 'border-border',
        )}
      />
      {validating && <p className="text-[10px] text-muted-foreground">Validating…</p>}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
