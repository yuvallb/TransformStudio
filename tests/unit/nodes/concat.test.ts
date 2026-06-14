import { describe, expect, it } from 'vitest';

import { concat } from '@/nodes/concat';

describe('concat', () => {
  it('compiles row concat', () => {
    const code = concat.compile({ axis: 0 }, ['node_a', 'node_b'], 'node_c', {});
    expect(code).toBe('node_c = pd.concat([node_a, node_b], axis=0)');
  });

  it('compiles column concat', () => {
    const code = concat.compile({ axis: 1 }, ['node_a', 'node_b'], 'node_c', {});
    expect(code).toBe('node_c = pd.concat([node_a, node_b], axis=1)');
  });

  it('requires both inputs connected', () => {
    expect(concat.validate({ axis: 0 }, [[], []], { inputVarCount: 1 })).toHaveLength(1);
  });

  it('validates matching row counts for column concat', () => {
    const errors = concat.validate({ axis: 1 }, [[], []], {
      inputVarCount: 2,
      inputRowCounts: [10, 5],
    });
    expect(errors.some((e) => e.field === 'axis')).toBe(true);
  });
});
