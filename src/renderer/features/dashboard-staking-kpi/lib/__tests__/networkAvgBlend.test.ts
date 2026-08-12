import { type ChainId } from '@/shared/core';
import { blendNetworkAvgRate } from '../apy';

const PAH = '0x01' as ChainId;
const KAH = '0x02' as ChainId;

const rate = (ratePercent: string, days: number) => ({ ratePercent, fromEra: 0, toEra: 1, days });

describe('blendNetworkAvgRate', () => {
  test('weights the per-chain rates by fiat weight and reports the longest window', () => {
    const blended = blendNetworkAvgRate([
      { chainId: PAH, rate: rate('3.00', 30), weight: '300' },
      { chainId: KAH, rate: rate('15.00', 21), weight: '100' },
    ]);

    // (3 × 300 + 15 × 100) / 400 = 6; the PAH window (30d) is the longest.
    expect(blended).toEqual({ rate: 6, days: 30 });
  });

  test('skips chains with an unknown rate instead of counting them as zero', () => {
    const blended = blendNetworkAvgRate([
      { chainId: PAH, rate: null, weight: '300' },
      { chainId: KAH, rate: rate('15.00', 21), weight: '100' },
    ]);

    expect(blended).toEqual({ rate: 15, days: 21 });
  });

  test('skips chains with no weight — their window must not leak into the label', () => {
    const blended = blendNetworkAvgRate([
      { chainId: PAH, rate: rate('3.00', 30), weight: '0' },
      { chainId: KAH, rate: rate('15.00', 21), weight: '100' },
    ]);

    expect(blended).toEqual({ rate: 15, days: 21 });
  });

  test('returns null when nothing can be weighted', () => {
    expect(blendNetworkAvgRate([])).toBeNull();
    expect(blendNetworkAvgRate([{ chainId: PAH, rate: null, weight: '300' }])).toBeNull();
    expect(blendNetworkAvgRate([{ chainId: PAH, rate: rate('3.00', 30), weight: '0' }])).toBeNull();
  });
});
