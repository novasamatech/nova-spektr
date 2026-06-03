import { describe, expect, it } from 'vitest';

import { type Rect, clampRect, compactVertical, resolveCollisions } from '../layout-engine';

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

describe('clampRect', () => {
  it('keeps a rect inside the grid and above its minimum size', () => {
    expect(clampRect({ x: 3, y: 0, w: 3, h: 1 }, { w: 2, h: 2 })).toEqual({ x: 2, y: 0, w: 2, h: 2 });
  });

  it('clamps negative positions to zero', () => {
    expect(clampRect({ x: -1, y: -4, w: 2, h: 2 }, { w: 1, h: 1 })).toEqual({ x: 0, y: 0, w: 2, h: 2 });
  });
});

describe('resolveCollisions', () => {
  it('pushes overlapped widgets down then compacts', () => {
    const layout: Record<string, Rect> = {
      moved: { x: 0, y: 0, w: 4, h: 2 },
      a: { x: 0, y: 0, w: 2, h: 2 }, // overlaps moved
      b: { x: 2, y: 0, w: 2, h: 2 }, // overlaps moved
    };

    expect(resolveCollisions(layout, 'moved')).toEqual({
      moved: { x: 0, y: 0, w: 4, h: 2 },
      a: { x: 0, y: 2, w: 2, h: 2 },
      b: { x: 2, y: 2, w: 2, h: 2 },
    });
  });
});
