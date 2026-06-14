import { useCallback, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';

import { extractParamRefs } from '@/engine/param-substitute';
import { kernelClient } from '@/engine/kernel-client';
import { cn } from '@/lib/utils';
import { translateExpression } from '@/nodes/expression';

interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  workflowParamNames?: string[];
}

export function ExpressionInput({
  value,
  onChange,
  placeholder = 'df["revenue"] > 1000',
  className,
  workflowParamNames = [],
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
      const result = await kernelClient.validateExpression(translateExpression(expr.trim()));
      setError(result.valid ? null : (result.error ?? 'Invalid expression'));
    } catch {
      setError('Validation failed');
    } finally {
      setValidating(false);
    }
  }, []);

  const linkedParams = extractParamRefs(value);
  const knownParams = new Set(workflowParamNames);
  const unknownParams = linkedParams.filter((name) => !knownParams.has(name));

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
      {linkedParams.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {linkedParams.map((name) => (
            <span
              key={name}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                knownParams.has(name)
                  ? 'bg-primary/10 text-primary'
                  : 'bg-amber-500/10 text-amber-700',
              )}
            >
              {'{'}{name}{'}'}
            </span>
          ))}
        </div>
      )}
      {unknownParams.length > 0 && (
        <p className="text-[10px] text-amber-700">
          Unknown parameter{unknownParams.length > 1 ? 's' : ''}: {unknownParams.map((n) => `{${n}}`).join(', ')}
        </p>
      )}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
