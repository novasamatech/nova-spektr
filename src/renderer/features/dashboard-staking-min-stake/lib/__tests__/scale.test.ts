import { buildWindow, fractionOf } from '../scale';

// The live 7-era series measured on Polkadot Asset Hub (2026-08-12), in DOT.
const REAL_SERIES = [1_150_003, 1_156_249, 1_150_003, 1_149_983, 1_160_234, 1_149_977, 1_149_983, 1_152_410];

describe('buildWindow', () => {
  test('should zoom the axis to the data instead of starting at zero', () => {
    const window = buildWindow(REAL_SERIES);

    expect(window.floor).toBeGreaterThan(1_000_000);
    expect(window.ceil).toBeLessThan(1_200_000);
    expect(window.floor).toBeLessThan(Math.min(...REAL_SERIES));
    expect(window.ceil).toBeGreaterThan(Math.max(...REAL_SERIES));
  });

  test('should keep every gridline strictly inside the window', () => {
    const window = buildWindow(REAL_SERIES);

    expect(window.gridlines.length).toBeGreaterThan(0);
    for (const line of window.gridlines) {
      expect(line).toBeGreaterThan(window.floor);
      expect(line).toBeLessThan(window.ceil);
    }
  });

  test('should give a literally constant series a visible band', () => {
    const window = buildWindow([1_150_000, 1_150_000, 1_150_000]);

    expect(window.span).toBeGreaterThan(0);
    // The flat line must sit inside the plot, not on its edges.
    const fraction = fractionOf(window, 1_150_000);
    expect(fraction).toBeGreaterThan(0.1);
    expect(fraction).toBeLessThan(0.9);
  });

  test('should never push the floor below zero', () => {
    const window = buildWindow([1, 5]);

    expect(window.floor).toBeGreaterThanOrEqual(0);
  });
});

describe('fractionOf', () => {
  test('should map floor to 0 and ceil to 1', () => {
    const window = buildWindow(REAL_SERIES);

    expect(fractionOf(window, window.floor)).toBe(0);
    expect(fractionOf(window, window.ceil)).toBe(1);
  });

  test('should clamp values outside the window', () => {
    const window = buildWindow(REAL_SERIES);

    expect(fractionOf(window, 0)).toBe(0);
    expect(fractionOf(window, 10_000_000)).toBe(1);
  });

  test('should keep the real series ordered by value', () => {
    const window = buildWindow(REAL_SERIES);
    const low = fractionOf(window, 1_149_977);
    const high = fractionOf(window, 1_160_234);

    expect(high).toBeGreaterThan(low);
  });
});
