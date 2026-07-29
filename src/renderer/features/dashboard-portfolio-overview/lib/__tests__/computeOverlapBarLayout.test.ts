import { computeOverlapBarLayout } from '../computeOverlapBarLayout';

const makeTypes = (pcts: { transferable?: number; reserved?: number; locked?: number; vested?: number }) => ({
  transferable: pcts.transferable ?? 0,
  reserved: pcts.reserved ?? 0,
  locked: pcts.locked ?? 0,
  vested: pcts.vested ?? 0,
});

describe('computeOverlapBarLayout', () => {
  test('without overlap renders vested as a plain segment and no marker', () => {
    const layout = computeOverlapBarLayout({
      types: makeTypes({ transferable: 60, locked: 10, vested: 30 }),
      overlapPct: 0,
      hasOverlap: false,
    });

    expect(layout.segments).toEqual([
      { type: 'transferable', pct: 60 },
      { type: 'locked', pct: 10 },
      { type: 'vested', pct: 30 },
    ]);
    expect(layout.overlapSpan).toBeNull();
  });

  test('drops zero-share segments', () => {
    const layout = computeOverlapBarLayout({
      types: makeTypes({ transferable: 100 }),
      overlapPct: 0,
      hasOverlap: false,
    });

    expect(layout.segments).toEqual([{ type: 'transferable', pct: 100 }]);
  });

  test('with overlap folds vested into locked and spans the marker across both', () => {
    // T=50, R=20, L=10, V=15, overlap=5
    const layout = computeOverlapBarLayout({
      types: makeTypes({ transferable: 50, reserved: 20, locked: 10, vested: 15 }),
      overlapPct: 5,
      hasOverlap: true,
    });

    expect(layout.segments).toEqual([
      { type: 'transferable', pct: 50 },
      { type: 'reserved', pct: 20 },
      { type: 'locked', pct: 25 },
    ]);
    // reaches left into reserved by the overlap, right into locked by vested
    expect(layout.overlapSpan).toEqual({ left: 65, width: 20 });
  });

  test('with overlap fully covered by reserved the marker sits inside reserved', () => {
    // staking wallet: vesting rides entirely on the hold, partition vested = 0
    const layout = computeOverlapBarLayout({
      types: makeTypes({ transferable: 10, reserved: 90 }),
      overlapPct: 5,
      hasOverlap: true,
    });

    expect(layout.segments).toEqual([
      { type: 'transferable', pct: 10 },
      { type: 'reserved', pct: 90 },
    ]);
    expect(layout.overlapSpan).toEqual({ left: 95, width: 5 });
  });

  test('clamps the marker inside the bar', () => {
    const layout = computeOverlapBarLayout({
      types: makeTypes({ reserved: 40, vested: 70 }),
      overlapPct: 50,
      hasOverlap: true,
    });

    expect(layout.overlapSpan!.left).toBe(0);
    expect(layout.overlapSpan!.width).toBe(100);
  });

  test('dust overlap (zero pct) still folds and yields a zero-width span for the min-px floor', () => {
    const layout = computeOverlapBarLayout({
      types: makeTypes({ transferable: 30, reserved: 70 }),
      overlapPct: 0,
      hasOverlap: true,
    });

    expect(layout.segments.find((s) => s.type === 'vested')).toBeUndefined();
    expect(layout.overlapSpan).toEqual({ left: 100, width: 0 });
  });
});
