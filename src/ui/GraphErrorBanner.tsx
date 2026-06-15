import { AlertCircle, X } from 'lucide-react';

import { useRuntimeStore } from '@/state/runtime-store';
import { Button } from '@/ui/components/ui/button';

export function GraphErrorBanner() {
  const graphError = useRuntimeStore((s) => s.graphError);
  const setGraphError = useRuntimeStore((s) => s.setGraphError);

  if (!graphError) return null;

  return (
    <div
      role="alert"
      className="flex shrink-0 items-start gap-2 border-b border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-300"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1">{graphError}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-red-700 hover:bg-red-500/10 hover:text-red-800 dark:text-red-300"
        onClick={() => setGraphError(null)}
        aria-label="Dismiss error"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
