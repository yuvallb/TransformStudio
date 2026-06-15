import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/ui/components/ui/button';

interface NodeErrorPanelProps {
  message: string;
  traceback?: string | null;
}

export function NodeErrorPanel({ message, traceback }: NodeErrorPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const hasTraceback = Boolean(traceback?.trim());

  const handleCopy = async () => {
    const text = hasTraceback ? `${message}\n\n${traceback}` : message;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Traceback copied');
    } catch {
      toast.error('Failed to copy traceback');
    }
  };

  return (
    <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-600">
      <p className="font-medium">{message}</p>

      {hasTraceback && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-red-700 hover:underline dark:text-red-400"
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            Full traceback
          </button>
          {expanded && (
            <pre className="mt-1.5 max-h-48 overflow-auto rounded border border-red-500/30 bg-background/80 p-2 font-mono text-[10px] leading-relaxed text-red-800 dark:text-red-300">
              {traceback}
            </pre>
          )}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 h-7 gap-1.5 border-red-500/30 text-[11px] text-red-700 hover:bg-red-500/10 dark:text-red-400"
        onClick={() => void handleCopy()}
      >
        <Copy className="size-3" />
        Copy traceback
      </Button>
    </div>
  );
}
