import { describe, expect, it } from 'vitest';

import { join } from '@/nodes/join';

const leftSchema = [
  { name: 'customer_id', dtype: 'int' as const, pandasDtype: 'int64', nullable: false },
];
const rightSchema = [
  { name: 'customer_id', dtype: 'int' as const, pandasDtype: 'int64', nullable: false },
];

describe('join', () => {
  it('compiles merge', () => {
    const code = join.compile(
      { leftOn: 'customer_id', rightOn: 'customer_id', how: 'inner' },
      ['node_left', 'node_right'],
      'node_out',
      {},
    );
    expect(code).toContain('.merge(');
    expect(code).toContain('left_on="customer_id"');
    expect(code).toContain('right_on="customer_id"');
  });

  it('requires join keys', () => {
    expect(join.validate({ leftOn: '', rightOn: '' }, [leftSchema, rightSchema])).toHaveLength(2);
  });

  it('validates keys against respective schemas', () => {
    const errors = join.validate(
      { leftOn: 'missing', rightOn: 'customer_id' },
      [leftSchema, rightSchema],
    );
    expect(errors.some((e) => e.field === 'leftOn')).toBe(true);
  });

  it('requires both inputs connected', () => {
    const errors = join.validate(
      { leftOn: 'customer_id', rightOn: 'customer_id' },
      [leftSchema, rightSchema],
      { inputVarCount: 1 },
    );
    expect(errors.some((e) => e.field === 'inputs')).toBe(true);
  });
});
