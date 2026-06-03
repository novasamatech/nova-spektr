import { describe, expect, it } from 'vitest';

import { type Rect, clampRect, compactVertical, placeNew, resolveCollisions, syncLayout } from '../layout-engine';

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

describe('placeNew', () => {
  it('places a new widget below existing ones', () => {
    const layout: Record<string, Rect> = { a: { x: 0, y: 0, w: 2, h: 2 } };

    expect(placeNew(layout, 'b', { w: 4, h: 1 })).toEqual({
      a: { x: 0, y: 0, w: 2, h: 2 },
      b: { x: 0, y: 2, w: 4, h: 1 },
    });
  });
});

describe('syncLayout', () => {
  const sizes = { a: { w: 2, h: 2 }, b: { w: 2, h: 2 }, c: { w: 4, h: 1 } };

  it('keeps known rects, drops stale keys, places missing in order', () => {
    const stored: Record<string, Rect> = {
      a: { x: 0, y: 0, w: 2, h: 2 },
      stale: { x: 2, y: 0, w: 2, h: 2 },
    };

    const result = syncLayout(stored, ['a', 'b', 'c'], sizes);

    expect(result.stale).toBeUndefined();
    expect(result.a).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(result.b).toBeDefined();
    expect(result.c).toBeDefined();
    expect(Object.keys(result).sort()).toEqual(['a', 'b', 'c']);
  });

  it('seeds an empty layout from key order (first-time migration)', () => {
    const result = syncLayout({}, ['c', 'a', 'b'], sizes);
    // c (w4) fills row 0; a and b wrap to the next rows, compacted
    expect(result.c).toEqual({ x: 0, y: 0, w: 4, h: 1 });
    expect(result.a).toEqual({ x: 0, y: 1, w: 2, h: 2 });
    expect(result.b).toEqual({ x: 2, y: 1, w: 2, h: 2 });
  });
});
