import { useCallback, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { saveWorkflow } from '@/data/workflow-repo';
import { DEMOS } from '@/lib/demos';
import { deserializeWorkflow } from '@/sharing/serialize';
import { useRuntimeStore } from '@/state/runtime-store';
import { useWorkflowStore } from '@/state/workflow-store';
import { Button } from '@/ui/components/ui/button';

export function DemoPicker() {
  const nodeCount = useWorkflowStore((s) => s.workflow.nodes.length);
  const loadWorkflowState = useWorkflowStore((s) => s.loadWorkflowState);
  const markAllStale = useWorkflowStore((s) => s.markAllStale);
  const [loadingId, setLoadingId] = useState<string | null>(null);

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
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="pointer-events-auto max-w-md rounded-lg border border-border bg-card/95 p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h2 className="text-sm font-semibold">Start with a demo</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Open a preset pipeline or drop a CSV/JSON file on the canvas.
        </p>
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
  );
}
