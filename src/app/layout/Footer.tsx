import { usePyodide } from '@/hooks/usePyodide';
import { useSelectedPreview } from '@/ui/PreviewGrid';
import { HelpButton } from '@/ui/HelpDialog';
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

function pyodideProgress(status: string, progressStage: string): number | null {
  if (status !== 'loading') return status === 'ready' ? 100 : null;
  if (progressStage.includes('pyodide')) return 25;
  if (progressStage.includes('pandas')) return 55;
  if (progressStage.includes('helper')) return 80;
  return 10;
}

export function Footer() {
  const { status, progressStage } = usePyodide();
  const label = statusLabel(status, progressStage);
  const progress = pyodideProgress(status, progressStage);
  const preview = useSelectedPreview();
  const isRunning = useRuntimeStore((s) => s.isRunning);

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-card px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 text-xs text-muted-foreground">
          {label}
          {isRunning && ' · Running pipeline…'}
        </span>
        {progress !== null && progress < 100 && (
          <progress
            className="h-1.5 w-24 overflow-hidden rounded-full accent-primary"
            value={progress}
            max={100}
            aria-label="Python runtime loading progress"
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        {preview && (
          <span className="text-xs text-muted-foreground">
            {preview.totalRows.toLocaleString()} rows × {preview.totalColumns} cols
          </span>
        )}
        <HelpButton />
      </div>
    </footer>
  );
}
