import { describe, expect, it } from 'vitest';

import { getNextNodePlacementPosition } from '@/canvas/node-placement';

describe('getNextNodePlacementPosition', () => {
  it('returns default origin when canvas is empty', () => {
    expect(getNextNodePlacementPosition([])).toEqual({ x: 80, y: 180 });
  });

  it('places to the right of the rightmost node', () => {
    const nodes = [
      { position: { x: 80, y: 180 } },
      { position: { x: 520, y: 240 } },
      { position: { x: 300, y: 100 } },
    ];

    expect(getNextNodePlacementPosition(nodes)).toEqual({ x: 740, y: 240 });
  });
});
