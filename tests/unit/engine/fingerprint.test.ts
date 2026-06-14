import { describe, expect, it } from 'vitest';

import { computeFingerprint } from '@/engine/fingerprint';
import type { WorkflowNode } from '@/lib/types';

const baseNode: WorkflowNode = {
  id: 'n1',
  type: 'filter',
  position: { x: 0, y: 0 },
  config: { expression: 'revenue > 1000' },
};

describe('computeFingerprint', () => {
  it('returns same hash for identical inputs', async () => {
    const a = await computeFingerprint(baseNode, {}, ['upstream1']);
    const b = await computeFingerprint(baseNode, {}, ['upstream1']);
    expect(a).toBe(b);
  });

  it('returns different hash when config changes', async () => {
    const a = await computeFingerprint(baseNode, {}, ['upstream1']);
    const changed = { ...baseNode, config: { expression: 'revenue > 2000' } };
    const b = await computeFingerprint(changed, {}, ['upstream1']);
    expect(a).not.toBe(b);
  });

  it('returns different hash when upstream fingerprints change', async () => {
    const a = await computeFingerprint(baseNode, {}, ['upstream1']);
    const b = await computeFingerprint(baseNode, {}, ['upstream2']);
    expect(a).not.toBe(b);
  });
});
