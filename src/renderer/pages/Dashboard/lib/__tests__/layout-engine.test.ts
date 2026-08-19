import { describe, expect, it } from 'vitest';

import { type Rect, clampRect, compactVertical, resolveCollisions, syncLayout } from '../layout-engine';

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

  it('clamps stored rects to the widget max size', () => {
    const stored: Record<string, Rect> = {
      a: { x: 0, y: 0, w: 4, h: 6 },
      b: { x: 0, y: 6, w: 2, h: 2 },
    };

    const result = syncLayout(stored, ['a', 'b'], sizes, { a: { w: 2, h: 2 } });

    expect(result.a).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    // b floats up under the clamped a
    expect(result.b).toEqual({ x: 0, y: 2, w: 2, h: 2 });
  });
});

describe('clampRect', () => {
  it('caps the width at the grid width and pulls x back inside it', () => {
    expect(clampRect({ x: 3, y: 0, w: 3, h: 2 })).toEqual({ x: 1, y: 0, w: 3, h: 2 });
  });

  it('raises a stored rect to the widget minimum', () => {
    expect(clampRect({ x: 0, y: 0, w: 1, h: 1 }, { w: 2, h: 3 })).toEqual({ x: 0, y: 0, w: 2, h: 3 });
  });

  it('lets the minimum win over a smaller maximum rather than inventing a zero', () => {
    expect(clampRect({ x: 0, y: 0, w: 4, h: 4 }, { w: 2, h: 2 }, { w: 1, h: 1 })).toEqual({
      x: 0,
      y: 0,
      w: 2,
      h: 2,
    });
  });

  it('never returns a negative origin', () => {
    expect(clampRect({ x: -2, y: -5, w: 2, h: 2 })).toEqual({ x: 0, y: 0, w: 2, h: 2 });
  });
});

describe('syncLayout bounds', () => {
  it('pulls a stored rect that hangs off the right edge back onto the grid', () => {
    const stored: Record<string, Rect> = { a: { x: 3, y: 0, w: 3, h: 2 } };

    const result = syncLayout(stored, ['a'], { a: { w: 3, h: 2 } });

    expect(result.a).toEqual({ x: 1, y: 0, w: 3, h: 2 });
  });

  it('grows a stored rect saved below a min size the widget declared later', () => {
    const stored: Record<string, Rect> = { a: { x: 0, y: 0, w: 1, h: 1 } };

    const result = syncLayout(stored, ['a'], { a: { w: 2, h: 2 } }, undefined, { a: { w: 2, h: 2 } });

    expect(result.a).toEqual({ x: 0, y: 0, w: 2, h: 2 });
  });
});

describe('syncLayout migration path', () => {
  it('reproduces a legacy order and appends a newly-added widget at the bottom', () => {
    const sizes = {
      portfolio: { w: 2, h: 4 },
      charts: { w: 2, h: 3 },
      queue: { w: 4, h: 3 },
    };

    // First load: empty stored, seeded from legacy order [charts, portfolio]
    const seeded = syncLayout({}, ['charts', 'portfolio'], sizes);
    expect(seeded.charts!.y).toBeLessThanOrEqual(seeded.portfolio!.y);

    // Later: a new widget 'queue' becomes available
    const withNew = syncLayout(seeded, ['charts', 'portfolio', 'queue'], sizes);
    expect(withNew.queue).toBeDefined();
    // queue lands at or below the existing widgets
    const existingBottom = Math.max(seeded.charts!.y + seeded.charts!.h, seeded.portfolio!.y + seeded.portfolio!.h);
    expect(withNew.queue!.y).toBeGreaterThanOrEqual(existingBottom);
    // and the existing widgets keep their positions
    expect(withNew.charts).toEqual(seeded.charts);
    expect(withNew.portfolio).toEqual(seeded.portfolio);
  });
});
