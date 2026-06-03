import { describe, expect, it } from 'vitest';

import { type Rect, compactVertical } from '../layout-engine';

describe('compactVertical', () => {
  it('floats widgets up to remove vertical gaps', () => {
    const layout: Record<string, Rect> = {
      a: { x: 0, y: 0, w: 2, h: 2 },
      b: { x: 0, y: 5, w: 2, h: 2 }, // gap above
    };

    expect(compactVertical(layout)).toEqual({
      a: { x: 0, y: 0, w: 2, h: 2 },
      b: { x: 0, y: 2, w: 2, h: 2 },
    });
  });

  it('keeps widgets in different columns independent', () => {
    const layout: Record<string, Rect> = {
      a: { x: 0, y: 0, w: 2, h: 3 },
      b: { x: 2, y: 0, w: 2, h: 1 },
      c: { x: 2, y: 4, w: 2, h: 1 },
    };

    expect(compactVertical(layout)).toEqual({
      a: { x: 0, y: 0, w: 2, h: 3 },
      b: { x: 2, y: 0, w: 2, h: 1 },
      c: { x: 2, y: 1, w: 2, h: 1 },
    });
  });
});
