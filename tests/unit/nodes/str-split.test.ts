import { describe, expect, it } from 'vitest';

import { strSplit } from '@/nodes/str-split';

const schema = [
  { name: 'tags', dtype: 'string' as const, pandasDtype: 'object', nullable: false },
];

describe('strSplit', () => {
  it('compiles expand split', () => {
    const code = strSplit.compile(
      { column: 'tags', pat: ',', expand: true, explode: false, into: ['tag1', 'tag2'] },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('.str.split(');
    expect(code).toContain('expand=True');
    expect(code).toContain('pd.concat(');
  });

  it('compiles explode split', () => {
    const code = strSplit.compile(
      { column: 'tags', pat: ',', expand: false, explode: true },
      ['node_in'],
      'node_out',
      {},
    );
    expect(code).toContain('.explode(');
  });

  it('requires column and delimiter', () => {
    expect(strSplit.validate({ column: '', pat: '' }, [schema])).toHaveLength(2);
  });

  it('requires into names when expanding', () => {
    const errors = strSplit.validate(
      { column: 'tags', pat: ',', expand: true, into: [] },
      [schema],
    );
    expect(errors.some((e) => e.field === 'into')).toBe(true);
  });
});
