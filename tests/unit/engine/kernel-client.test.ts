import { describe, expect, it } from 'vitest';

import { parsePythonException } from '@/engine/errors';

describe('parsePythonException', () => {
  it('extracts message and traceback from Pyodide-style errors', () => {
    const error = parsePythonException({
      message: 'SyntaxError: invalid syntax',
      traceback: 'Traceback (most recent call last):\n  File "<stdin>"',
    });

    expect(error).toEqual({
      message: 'SyntaxError: invalid syntax',
      traceback: 'Traceback (most recent call last):\n  File "<stdin>"',
      nodeId: undefined,
    });
  });

  it('includes nodeId when provided', () => {
    const error = parsePythonException(new Error('Node failed'), 'n1');
    expect(error).toEqual({
      message: 'Node failed',
      traceback: undefined,
      nodeId: 'n1',
    });
  });

  it('stringifies unknown values', () => {
    expect(parsePythonException(42).message).toBe('42');
  });
});
