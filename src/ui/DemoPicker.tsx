import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { saveWorkflow } from '@/data/workflow-repo';
import { DEMOS } from '@/lib/demos';
import { SITE } from '@/lib/site-config';
import { deserializeWorkflow } from '@/sharing/serialize';
import { useRuntimeStore } from '@/state/runtime-store';
import { useUiStore } from '@/state/ui-store';
import { useWorkflowStore } from '@/state/workflow-store';
import { BrandLogo } from '@/ui/BrandLogo';
import { Button } from '@/ui/components/ui/button';

export function DemoPicker() {
  const nodeCount = useWorkflowStore((s) => s.workflow.nodes.length);
  const loadWorkflowState = useWorkflowStore((s) => s.loadWorkflowState);
  const markAllStale = useWorkflowStore((s) => s.markAllStale);
  const setAboutDialogOpen = useUiStore((s) => s.setAboutDialogOpen);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(SITE.welcomeHintStorageKey);
      setShowHint(dismissed !== '1');
    } catch {
      setShowHint(true);
    }
  }, []);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    try {
      localStorage.setItem(SITE.welcomeHintStorageKey, '1');
    } catch {
      // ignore storage errors
    }
  }, []);

  const loadDemo = useCallback(
    async (demo: (typeof DEMOS)[number]) => {
      setLoadingId(demo.id);
      try {
        const response = await fetch(demo.file);
        if (!response.ok) {
          throw new Error(`Failed to load demo (${response.status})`);
        }
        const text = await response.text();
        const workflow = deserializeWorkflow(text);
        useRuntimeStore.getState().reset();
        loadWorkflowState(workflow, {});
        markAllStale();
        await saveWorkflow(workflow);
        toast.success(`Loaded demo: ${demo.label}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to load demo: ${message}`);
      } finally {
        setLoadingId(null);
      }
    },
    [loadWorkflowState, markAllStale],
  );

  if (nodeCount > 0) return null;


  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-md space-y-3">
        {showHint && (
          <div className="flex items-start gap-2 rounded-md border border-border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
            <p className="flex-1">{SITE.welcomeHint}</p>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 hover:bg-muted hover:text-foreground"
              onClick={dismissHint}
              aria-label="Dismiss hint"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card/95 p-6 shadow-lg backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2">
            <BrandLogo size="sm" />
            <div>
              <h2 className="text-sm font-semibold">{SITE.name}</h2>
              <p className="text-xs text-muted-foreground">{SITE.tagline}</p>
            </div>
          </div>

          <button
            type="button"
            className="mb-4 text-xs text-primary hover:underline"
            onClick={() => setAboutDialogOpen(true)}
          >
            Learn more
          </button>

          <p className="mb-3 text-xs font-medium text-muted-foreground">Start with a demo</p>
          <div className="flex flex-col gap-2">
            {DEMOS.map((demo) => (
              <Button
                key={demo.id}
                type="button"
                variant="outline"
                className="h-auto flex-col items-start gap-0.5 px-3 py-2"
                disabled={loadingId !== null}
                onClick={() => void loadDemo(demo)}
              >
                <span className="text-sm font-medium">{demo.label}</span>
                <span className="text-xs font-normal text-muted-foreground">{demo.description}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
