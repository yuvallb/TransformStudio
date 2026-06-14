import { usePyodide } from '@/hooks/usePyodide';
import { useSelectedPreview } from '@/ui/PreviewGrid';
import { useRuntimeStore } from '@/state/runtime-store';

function statusLabel(status: string, progressStage: string): string {
  switch (status) {
    case 'loading':
      return progressStage || 'Loading…';
    case 'ready':
      return 'Python ready';
    case 'error':
      return 'Python error';
    case 'crashed':
      return 'Python crashed — restarting…';
    default:
      return 'Ready';
  }
}

export function Footer() {
  const { status, progressStage } = usePyodide();
  const label = statusLabel(status, progressStage);
  const preview = useSelectedPreview();
  const isRunning = useRuntimeStore((s) => s.isRunning);
  const graphError = useRuntimeStore((s) => s.graphError);

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-card px-4">
      <span className="text-xs text-muted-foreground">
        {label}
        {isRunning && ' · Running pipeline…'}
        {graphError && ` · ${graphError}`}
      </span>
      {preview && (
        <span className="text-xs text-muted-foreground">
          {preview.totalRows.toLocaleString()} rows × {preview.totalColumns} cols
        </span>
      )}
    </footer>
  );
}
