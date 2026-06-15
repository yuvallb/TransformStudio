import type { StructuredError } from '@/lib/types';

export function parsePythonException(err: unknown, nodeId?: string): StructuredError {
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const message =
      typeof record.message === 'string'
        ? record.message
        : err instanceof Error
          ? err.message
          : String(err);
    const traceback = typeof record.traceback === 'string' ? record.traceback : undefined;
    return { message, traceback, nodeId };
  }

  return { message: String(err), nodeId };
}
