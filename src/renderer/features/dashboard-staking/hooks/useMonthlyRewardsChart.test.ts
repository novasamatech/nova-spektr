import { describe, expect, it } from 'vitest';

import { toAccountId } from '@/shared/lib/utils';
import { type MonthlyRewardRecord } from '@/domains/staking';

import { bucketRecords, generateMonthBoundaries } from './useMonthlyRewardsChart';

// Covers a deprecated hook: nothing renders `MonthlyRewardsWidget` any more, the
// rewards chart of the staking tab is `features/dashboard-staking-rewards-chart`.
// Kept while the module is - the bucketing rules are still the reference.

// Use real-ish SS58 addresses so toAccountId normalization in bucketRecords works consistently
const ADDR_A = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const ADDR_B = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

const ID_A = toAccountId(ADDR_A);
const ID_B = toAccountId(ADDR_B);

/**
 * The record carries indexer columns (id, block, type) that bucketing never
 * reads; a factory keeps them out of every fixture below.
 */
const record = (address: string, amount: string, timestamp: number): MonthlyRewardRecord => ({
  id: `${timestamp}-0-${address}`,
  address,
  amount,
  timestamp,
  blockNumber: 0,
  type: 'reward',
});

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

      const records: MonthlyRewardRecord[] = [record(ADDR_A, '10000000000', midMonth)];

      const { bars } = bucketRecords(records, boundaries, precision, undefined, undefined, [ID_A]);
      expect(bars[6]!.rawTotal).toBeCloseTo(1.0, 5);
      expect(bars.filter((b) => b.rawTotal === 0)).toHaveLength(11);
    });

    it('should track per-account amounts in bar data', () => {
      const ts = boundaries[3]!.start + 100;
      const records: MonthlyRewardRecord[] = [record(ADDR_A, '5000000000', ts), record(ADDR_B, '3000000000', ts + 50)];

      const { bars } = bucketRecords(records, boundaries, precision, undefined, undefined, [ID_A, ID_B]);
      expect(bars[3]![ID_A]).toBeCloseTo(0.5, 5);
      expect(bars[3]![ID_B]).toBeCloseTo(0.3, 5);
      expect(bars[3]!.rawTotal).toBeCloseTo(0.8, 5);
    });

    it('should return active accounts that have rewards', () => {
      const records: MonthlyRewardRecord[] = [record(ADDR_A, '10000000000', boundaries[0]!.start + 100)];

      const { activeAccounts } = bucketRecords(records, boundaries, precision, undefined, undefined, [ID_A, ID_B]);
      expect(activeAccounts).toContain(ID_A);
      expect(activeAccounts).not.toContain(ID_B);
    });

    it('should mark the peak month', () => {
      const records: MonthlyRewardRecord[] = [
        record(ADDR_A, '1000000000', boundaries[0]!.start + 100),
        record(ADDR_A, '5000000000', boundaries[5]!.start + 100),
        record(ADDR_A, '2000000000', boundaries[9]!.start + 100),
      ];

      const { bars } = bucketRecords(records, boundaries, precision, undefined, undefined, [ID_A]);
      expect(bars[5]!.isPeak).toBe(true);
      expect(bars.filter((b) => b.isPeak)).toHaveLength(1);
    });

    it('should compute fiat amounts when price is provided', () => {
      const records: MonthlyRewardRecord[] = [record(ADDR_A, '10000000000', boundaries[0]!.start + 100)];

      const { bars } = bucketRecords(records, boundaries, precision, 5.0, '$', [ID_A]);
      expect(bars[0]!.fiatAmount).toContain('$');
    });
  });
});
