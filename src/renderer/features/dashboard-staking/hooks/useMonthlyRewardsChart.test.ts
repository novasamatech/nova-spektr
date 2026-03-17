import { describe, expect, it } from 'vitest';

import { type MonthlyRewardRecord } from '@/domains/staking';

import { bucketRecords, generateMonthBoundaries } from './useMonthlyRewardsChart';

describe('useMonthlyRewardsChart', () => {
  describe('generateMonthBoundaries', () => {
    it('should return exactly 12 month boundaries', () => {
      const boundaries = generateMonthBoundaries();
      expect(boundaries).toHaveLength(12);
    });

    it('should end with current month', () => {
      const boundaries = generateMonthBoundaries();
      const now = new Date();
      const last = boundaries[11]!;
      expect(last.month).toBe(now.getMonth());
      expect(last.year).toBe(now.getFullYear());
    });

    it('should have consecutive months', () => {
      const boundaries = generateMonthBoundaries();
      for (let i = 1; i < boundaries.length; i++) {
        const prev = boundaries[i - 1]!;
        const curr = boundaries[i]!;
        expect(curr.start).toBe(prev.end);
      }
    });
  });

  describe('bucketRecords', () => {
    const boundaries = generateMonthBoundaries();
    const precision = 10;

    it('should return 12 bars with zero totals for empty records', () => {
      const { bars } = bucketRecords([], boundaries, precision, undefined, undefined, []);
      expect(bars).toHaveLength(12);
      expect(bars.every((b) => b.rawTotal === 0)).toBe(true);
    });

    it('should bucket a record into the correct month', () => {
      const midMonth = Math.floor((boundaries[6]!.start + boundaries[6]!.end) / 2);

      const records: MonthlyRewardRecord[] = [{ address: '5abc', amount: '10000000000', timestamp: midMonth }];

      const { bars } = bucketRecords(records, boundaries, precision, undefined, undefined, ['5abc']);
      expect(bars[6]!.rawTotal).toBeCloseTo(1.0, 5);
      expect(bars.filter((b) => b.rawTotal === 0)).toHaveLength(11);
    });

    it('should track per-account amounts in bar data', () => {
      const ts = boundaries[3]!.start + 100;
      const records: MonthlyRewardRecord[] = [
        { address: '5abc', amount: '5000000000', timestamp: ts },
        { address: '5def', amount: '3000000000', timestamp: ts + 50 },
      ];

      const { bars } = bucketRecords(records, boundaries, precision, undefined, undefined, ['5abc', '5def']);
      expect(bars[3]!['5abc']).toBeCloseTo(0.5, 5);
      expect(bars[3]!['5def']).toBeCloseTo(0.3, 5);
      expect(bars[3]!.rawTotal).toBeCloseTo(0.8, 5);
    });

    it('should return active accounts that have rewards', () => {
      const records: MonthlyRewardRecord[] = [
        { address: '5abc', amount: '10000000000', timestamp: boundaries[0]!.start + 100 },
      ];

      const { activeAccounts } = bucketRecords(records, boundaries, precision, undefined, undefined, ['5abc', '5def']);
      expect(activeAccounts).toContain('5abc');
      expect(activeAccounts).not.toContain('5def');
    });

    it('should mark the peak month', () => {
      const records: MonthlyRewardRecord[] = [
        { address: '5abc', amount: '1000000000', timestamp: boundaries[0]!.start + 100 },
        { address: '5abc', amount: '5000000000', timestamp: boundaries[5]!.start + 100 },
        { address: '5abc', amount: '2000000000', timestamp: boundaries[9]!.start + 100 },
      ];

      const { bars } = bucketRecords(records, boundaries, precision, undefined, undefined, ['5abc']);
      expect(bars[5]!.isPeak).toBe(true);
      expect(bars.filter((b) => b.isPeak)).toHaveLength(1);
    });

    it('should compute fiat amounts when price is provided', () => {
      const records: MonthlyRewardRecord[] = [
        { address: '5abc', amount: '10000000000', timestamp: boundaries[0]!.start + 100 },
      ];

      const { bars } = bucketRecords(records, boundaries, precision, 5.0, '$', ['5abc']);
      expect(bars[0]!.fiatAmount).toContain('$');
    });
  });
});
