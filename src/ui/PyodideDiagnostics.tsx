import { useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';

import { kernelClient } from '@/engine/kernel-client';
import type { PreviewPayload } from '@/lib/types';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';

const SMOKE_TEST_CODE = `
import pandas as pd
_df = pd.DataFrame({"region": ["North", "South"], "revenue": [1500, 800]})
preview_df(_df)
`.trim();

function isPreviewPayload(value: unknown): value is PreviewPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.columns) && Array.isArray(record.rows);
}

export function PyodideDiagnostics() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setPreview(null);
    setError(null);

    try {
      const result = await kernelClient.runPython(SMOKE_TEST_CODE);
      if (result.error) {
        setError(result.error.message);
        if (result.error.traceback) {
          setError(`${result.error.message}\n\n${result.error.traceback}`);
        }
      } else if (isPreviewPayload(result.result)) {
        setPreview(result.result);
      } else {
        setError('Unexpected result from Pyodide smoke test');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    void runTest();
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleOpen}>
        <FlaskConical className="size-3.5" />
        Test Pyodide
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pyodide diagnostics</DialogTitle>
            <DialogDescription>
              Runs a small pandas DataFrame in the worker and returns a preview head.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Running smoke test…
              </div>
            )}

            {!loading && error && (
              <pre className="max-h-48 overflow-auto rounded-md border border-red-500/40 bg-red-500/10 p-3 font-mono text-xs text-red-700 dark:text-red-300">
                {error}
              </pre>
            )}

            {!loading && preview && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {preview.totalRows} rows × {preview.totalColumns} cols
                </p>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {preview.columns.map((col) => (
                          <th key={col.name} className="px-2 py-1.5 text-left font-medium">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          {preview.columns.map((col) => (
                            <td key={col.name} className="px-2 py-1.5 text-muted-foreground">
                              {String(row[col.name] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void runTest()}
            >
              Run again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
