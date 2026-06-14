import { describe, expect, it } from 'vitest';

import { filter } from '@/nodes/filter';

describe('filter param substitution', () => {
  it('substitutes {param} with params dict access in compile output', () => {
    const code = filter.compile(
      { expression: 'df["country"] == {country}' },
      ['node_a'],
      'node_b',
      { country: 'US' },
    );
    expect(code).toBe("node_b = node_a[node_a[\"country\"] == params['country']]");
  });

  it('supports multiple param references', () => {
    const code = filter.compile(
      { expression: 'df["revenue"] > {min_revenue} and df["country"] == {country}' },
      ['node_a'],
      'node_b',
      { country: 'US', min_revenue: 1000 },
    );
    expect(code).toContain("params['min_revenue']");
    expect(code).toContain("params['country']");
    expect(code).not.toContain('.eval(');
  });

  it('validates unknown param references', () => {
    const errors = filter.validate(
      { expression: 'country == {country}' },
      [[]],
      { workflowParamNames: [] },
    );
    expect(errors.some((e) => e.message.includes('Unknown parameter'))).toBe(true);
  });

  it('accepts defined param references', () => {
    const errors = filter.validate(
      { expression: 'country == {country}' },
      [[]],
      { workflowParamNames: ['country'] },
    );
    expect(errors.some((e) => e.message.includes('Unknown parameter'))).toBe(false);
  });
});
