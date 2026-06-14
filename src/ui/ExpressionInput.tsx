import { useCallback, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';

import { kernelClient } from '@/engine/kernel-client';
import { cn } from '@/lib/utils';

interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ExpressionInput({
  value,
  onChange,
  placeholder = 'df["revenue"] > 1000',
  className,
}: ExpressionInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const valueRef = useRef(value);

  valueRef.current = value;

  const validate = useCallback(async (expr: string) => {
    if (!expr.trim()) {
      setError(null);
      return;
    }
    setValidating(true);
    try {
      const result = await kernelClient.validateExpression(expr);
      setError(result.valid ? null : (result.error ?? 'Invalid expression'));
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
        height="72px"
        extensions={[python()]}
        onChange={(next) => onChange(next)}
        onBlur={() => void validate(valueRef.current)}
        placeholder={placeholder}
        basicSetup={{ lineNumbers: false, foldGutter: false }}
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
