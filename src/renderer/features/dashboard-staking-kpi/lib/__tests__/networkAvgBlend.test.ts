import { type ChainId } from '@/shared/core';
import { blendNetworkAvgRate, computeWeightedApy, sameContributingChains } from '../apy';

const PAH = '0x01' as ChainId;
const KAH = '0x02' as ChainId;

const rate = (ratePercent: string, days: number) => ({ ratePercent, fromEra: 0, toEra: 1, days });

describe('blendNetworkAvgRate', () => {
  test('weights the per-chain rates by fiat weight and reports the longest window', () => {
    const blended = blendNetworkAvgRate([
      { chainId: KAH, rate: rate('15.00', 21), weight: '100' },
      { chainId: PAH, rate: rate('3.00', 30), weight: '300' },
    ]);

    // (3 × 300 + 15 × 100) / 400 = 6; the PAH window (30d) is the longest even though it's listed second.
    expect(blended).toEqual({ rate: 6, days: 30, coverage: 1 });
  });

  test('skips chains with an unknown rate instead of counting them as zero', () => {
    const blended = blendNetworkAvgRate([
      { chainId: PAH, rate: null, weight: '300' },
      { chainId: KAH, rate: rate('15.00', 21), weight: '100' },
    ]);

    // PAH's weight still counts toward the positive pool, so coverage is 100 / (300 + 100) = 0.25.
    expect(blended).toEqual({ rate: 15, days: 21, coverage: 0.25 });
  });

  test('skips chains with no weight — their window must not leak into the label', () => {
    const blended = blendNetworkAvgRate([
      { chainId: PAH, rate: rate('3.00', 30), weight: '0' },
      { chainId: KAH, rate: rate('15.00', 21), weight: '100' },
    ]);

    // A zero weight is not "positive weight", so it never enters the coverage denominator either.
    expect(blended).toEqual({ rate: 15, days: 21, coverage: 1 });
  });

  test('treats a non-numeric rate the same as an unknown rate', () => {
    const blended = blendNetworkAvgRate([
      { chainId: PAH, rate: rate('not-a-number', 30), weight: '300' },
      { chainId: KAH, rate: rate('15.00', 21), weight: '100' },
    ]);

    expect(blended).toEqual({ rate: 15, days: 21, coverage: 0.25 });
  });

  test('returns null when nothing can be weighted', () => {
    expect(blendNetworkAvgRate([])).toBeNull();
    expect(blendNetworkAvgRate([{ chainId: PAH, rate: null, weight: '300' }])).toBeNull();
    expect(blendNetworkAvgRate([{ chainId: PAH, rate: rate('3.00', 30), weight: '0' }])).toBeNull();
  });

  test('agrees with computeWeightedApy on which chains contribute', () => {
    // One chain with an unknown rate (but real weight), one with weight but no stake, two contributors.
    const apyResult = computeWeightedApy([
      { chainId: PAH, apy: null, weight: '500' },
      { chainId: KAH, apy: 10, weight: '0' },
      { chainId: '0x03' as ChainId, apy: 3, weight: '300' },
      { chainId: '0x04' as ChainId, apy: 15, weight: '100' },
    ]);

    const blendResult = blendNetworkAvgRate([
      { chainId: PAH, rate: null, weight: '500' },
      { chainId: KAH, rate: rate('10.00', 21), weight: '0' },
      { chainId: '0x03' as ChainId, rate: rate('3.00', 30), weight: '300' },
      { chainId: '0x04' as ChainId, rate: rate('15.00', 21), weight: '100' },
    ]);

    expect(apyResult).not.toBeNull();
    expect(blendResult).not.toBeNull();
    expect(blendResult?.rate).toBe(apyResult);
  });
});

describe('sameContributingChains', () => {
  test('matches when both readings answer for the same chains, whatever the values are', () => {
    const result = sameContributingChains(
      [
        { chainId: PAH, apy: 5, weight: '300' },
        { chainId: KAH, apy: 14, weight: '100' },
      ],
      [
        { chainId: PAH, rate: rate('3.00', 30), weight: '300' },
        { chainId: KAH, rate: rate('15.00', 21), weight: '100' },
      ],
    );

    expect(result).toBe(true);
  });

  test('rejects a benchmark missing a chain the headline covers', () => {
    const result = sameContributingChains(
      [
        { chainId: PAH, apy: 5, weight: '300' },
        { chainId: KAH, apy: 14, weight: '100' },
      ],
      [
        { chainId: PAH, rate: null, weight: '300' },
        { chainId: KAH, rate: rate('15.00', 21), weight: '100' },
      ],
    );

    expect(result).toBe(false);
  });

  test('rejects a benchmark covering a chain the headline does not', () => {
    const result = sameContributingChains(
      [
        { chainId: PAH, apy: null, weight: '300' },
        { chainId: KAH, apy: 14, weight: '100' },
      ],
      [
        { chainId: PAH, rate: rate('3.00', 30), weight: '300' },
        { chainId: KAH, rate: rate('15.00', 21), weight: '100' },
      ],
    );

    expect(result).toBe(false);
  });

  test('ignores weightless chains on both sides', () => {
    const result = sameContributingChains(
      [
        { chainId: PAH, apy: 5, weight: '300' },
        { chainId: KAH, apy: 14, weight: '0' },
      ],
      [
        { chainId: PAH, rate: rate('3.00', 30), weight: '300' },
        { chainId: KAH, rate: null, weight: '0' },
      ],
    );

    expect(result).toBe(true);
  });
});
