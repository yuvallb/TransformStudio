import { describe, expect, it } from 'vitest';

import {
  extractBareColumnNames,
  validateExpressionColumns,
} from '@/nodes/expression';
import { peekCsvColumnNames } from '@/lib/csv-preview';
import { filter } from '@/nodes/filter';

describe('extractBareColumnNames', () => {
  it('extracts bare column identifiers', () => {
    expect(extractBareColumnNames('revenue > 1000')).toEqual(['revenue']);
  });

  it('ignores keywords, params, and df references', () => {
    expect(extractBareColumnNames('df["revenue"] > 1000 and country == {country}')).toEqual([
      'country',
    ]);
  });
});

describe('validateExpressionColumns', () => {
  it('reports missing bare and bracket columns', () => {
    const errors = validateExpressionColumns('revenue > 1000 and df["region"] == "North"', [
      'region',
    ]);
    expect(errors).toContain('Column "revenue" not found upstream');
    expect(errors).not.toContain('Column "region" not found upstream');
  });
});

describe('peekCsvColumnNames', () => {
  it('reads header row from csv bytes', () => {
    const data = new TextEncoder().encode('region,country,revenue\nNorth,US,1500');
    expect(peekCsvColumnNames(data)).toEqual(['region', 'country', 'revenue']);
  });
});

describe('filter column validation', () => {
  it('rejects bare column names missing upstream', () => {
    const errors = filter.validate(
      { expression: 'revenue > 1000' },
      [[{ name: 'region', dtype: 'string', pandasDtype: 'object', nullable: false }]],
    );
    expect(errors.some((e) => e.message.includes('Column "revenue" not found upstream'))).toBe(
      true,
    );
  });
});
