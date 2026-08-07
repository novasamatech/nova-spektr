import { describe, expect, test } from 'vitest';

import { realisedApy } from '../realised-apy';

describe('realisedApy', () => {
  test('reproduces the annualisation the figure is expected to match', () => {
    // 3333 earned on 1,000,000 staked over 1–31 July: 3.9243%.
    expect(realisedApy('3333', '1000000', 31)).toBeCloseTo(3.92433871, 6);
    expect(realisedApy('3000', '1000000', 31)).toBeCloseTo(3.532258065, 6);
    // A validator's own 30,000 earning 300 over the same window: 11.774%.
    expect(realisedApy('300', '30000', 31)).toBeCloseTo(11.77419355, 6);
  });

  test('a yield over nothing staked does not exist', () => {
    expect(realisedApy('100', '0', 30)).toBeNull();
  });

  test('a window of no length cannot be annualised', () => {
    expect(realisedApy('100', '1000', null)).toBeNull();
    expect(realisedApy('100', '1000', 0)).toBeNull();
  });

  test('earning nothing is a real zero', () => {
    expect(realisedApy('0', '1000', 30)).toBe(0);
  });
});
