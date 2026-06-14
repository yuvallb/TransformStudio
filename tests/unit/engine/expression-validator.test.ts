import { describe, expect, it } from 'vitest';

import { isExpressionSafe } from '@/nodes/expression';

describe('expression safety (sync pre-check)', () => {
  it('rejects import statements', () => {
    expect(isExpressionSafe("import os")).toBe(false);
  });

  it('rejects dunder names', () => {
    expect(isExpressionSafe("__import__('os')")).toBe(false);
  });

  it('rejects exec', () => {
    expect(isExpressionSafe("exec('x')")).toBe(false);
  });

  it('rejects non-whitelisted function calls', () => {
    expect(isExpressionSafe('foo()')).toBe(false);
  });

  it('allows whitelisted function calls', () => {
    expect(isExpressionSafe('abs(revenue)')).toBe(true);
  });

  it('allows simple comparisons', () => {
    expect(isExpressionSafe('revenue > 1000')).toBe(true);
  });

  it('allows bracket notation', () => {
    expect(isExpressionSafe('df["revenue"] > 1000')).toBe(true);
  });
});
