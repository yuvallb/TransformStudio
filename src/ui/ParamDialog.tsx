import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';

import { getEffectiveParams } from '@/engine/param-substitute';
import type { WorkflowParam } from '@/lib/types';
import { useWorkflowStore } from '@/state/workflow-store';
import { ParamValueEditor } from '@/ui/ParamValueEditor';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';

interface ParamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRun: () => void;
}

export function ParamDialog({ open, onOpenChange, onRun }: ParamDialogProps) {
  const params = useWorkflowStore((s) => s.workflow.params);
  const paramOverrides = useWorkflowStore((s) => s.paramOverrides);
  const setParamOverrides = useWorkflowStore((s) => s.setParamOverrides);

  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!open) return;
    setValues(getEffectiveParams(params, paramOverrides));
  }, [open, params, paramOverrides]);

  const updateValue = (param: WorkflowParam, value: unknown) => {
    setValues((prev) => ({ ...prev, [param.name]: value }));
  };

  const handleRun = () => {
    setParamOverrides(values);
    onOpenChange(false);
    onRun();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Run with parameters</DialogTitle>
          <DialogDescription>
            Override parameter values for this run. Workflow defaults are unchanged.
          </DialogDescription>
        </DialogHeader>

        {params.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No parameters defined. Add parameters in the sidebar to use this feature.
          </p>
        ) : (
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto py-1">
            {params.map((param) => (
              <label key={param.name} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium">
                  {param.label ?? param.name}
                  <span className="ml-1 font-normal text-muted-foreground">({param.type})</span>
                </span>
                <ParamValueEditor
                  param={param}
                  value={values[param.name] ?? param.default}
                  onChange={(value) => updateValue(param, value)}
                />
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={params.length === 0}>
            <Play className="mr-1 size-4" />
            Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
