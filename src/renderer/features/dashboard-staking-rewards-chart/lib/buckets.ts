import { default as BigNumber } from 'bignumber.js';
import { addDays, addMonths, addWeeks, startOfDay, startOfMonth, startOfWeek } from 'date-fns';

import { LABEL_LIMIT } from './constants';
import {
  type AccountShare,
  type BucketGranularity,
  type RangeKey,
  type RewardBucket,
  type RewardRecordLike,
} from './types';

/** Chip order, left to right. */
export const RANGE_KEYS: RangeKey[] = ['7d', '30d', '90d', '1y'];

export const DEFAULT_RANGE: RangeKey = '30d';

/**
 * How each range is cut into bars. The counts are chosen so a bar stays wide
 * enough to hover: a year is 12 months rather than 52 weeks, and 90 days is 13
 * weeks rather than 90 days.
 */
export const RANGE_CONFIG: Record<RangeKey, { granularity: BucketGranularity; count: number }> = {
  '7d': { granularity: 'day', count: 7 },
  '30d': { granularity: 'day', count: 30 },
  '90d': { granularity: 'week', count: 13 },
  '1y': { granularity: 'month', count: 12 },
};

/** Weeks start on Monday, matching the app's `en-GB` date locale. */
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

/**
 * Value labels are drawn above the bars only while they fit. Past the limit the
 * chart leans on the hover card instead, and dims the bars that are not hovered
 * so the pointed-at one stays identifiable without a label.
 */
export const shouldShowValueLabels = (bucketCount: number): boolean => {
  return bucketCount > 0 && bucketCount <= LABEL_LIMIT;
};

/**
 * Contiguous, calendar-aligned boundaries ending with the bucket that contains
 * `nowMs`. The current bucket is always included even though it is only
 * partially elapsed — a chart that hid today would look stale.
 */
export const buildBucketBoundaries = (range: RangeKey, nowMs: number): { start: number; end: number }[] => {
  const { granularity, count } = RANGE_CONFIG[range];

  const stepBack = (index: number): Date => {
    const back = count - 1 - index;

    switch (granularity) {
      case 'day':
        return addDays(startOfDay(nowMs), -back);
      case 'week':
        return addWeeks(startOfWeek(nowMs, WEEK_OPTIONS), -back);
      case 'month':
        return addMonths(startOfMonth(nowMs), -back);
    }
  };

  const stepForward = (date: Date): Date => {
    switch (granularity) {
      case 'day':
        return addDays(date, 1);
      case 'week':
        return addWeeks(date, 1);
      case 'month':
        return addMonths(date, 1);
    }
  };

  const boundaries: { start: number; end: number }[] = [];

  for (let index = 0; index < count; index++) {
    const start = stepBack(index);
    boundaries.push({ start: start.getTime(), end: stepForward(start).getTime() });
  }

  return boundaries;
};

/**
 * Index of the bucket holding `timestampMs`, or `-1` when the moment falls
 * outside the range. Boundaries are sorted and contiguous, so a binary search
 * keeps a year of records cheap.
 */
const findBucketIndex = (boundaries: { start: number; end: number }[], timestampMs: number): number => {
  let low = 0;
  let high = boundaries.length - 1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const bucket = boundaries[middle];
    if (!bucket) return -1;

    if (timestampMs < bucket.start) {
      high = middle - 1;
    } else if (timestampMs >= bucket.end) {
      low = middle + 1;
    } else {
      return middle;
    }
  }

  return -1;
};

type BuildBucketsParams = {
  records: RewardRecordLike[];
  range: RangeKey;
  /** Wall clock is an input, never read inside — keeps the function testable. */
  nowMs: number;
  /**
   * Address → stable account key. Injected rather than imported so bucketing
   * stays pure and free of SS58 decoding in tests.
   */
  resolveAccountId: (address: string) => string;
};

/**
 * Every bar of the selected range, including the empty ones — a month with no
 * payout is information, not a gap to be skipped.
 */
export const buildBuckets = ({ records, range, nowMs, resolveAccountId }: BuildBucketsParams): RewardBucket[] => {
  const { granularity } = RANGE_CONFIG[range];
  const boundaries = buildBucketBoundaries(range, nowMs);
  const sums = boundaries.map(() => new Map<string, BigNumber>());

  for (const record of records) {
    const index = findBucketIndex(boundaries, record.timestamp * 1000);
    if (index < 0) continue;

    const bucketSums = sums[index];
    if (!bucketSums) continue;

    const accountId = resolveAccountId(record.address);
    const current = bucketSums.get(accountId) ?? new BigNumber(0);
    bucketSums.set(accountId, current.plus(record.amount));
  }

  return boundaries.map((boundary, index) => {
    const bucketSums = sums[index] ?? new Map<string, BigNumber>();

    let total = new BigNumber(0);
    for (const amount of bucketSums.values()) {
      total = total.plus(amount);
    }

    const accounts: AccountShare[] = [...bucketSums.entries()]
      .filter(([, amount]) => amount.gt(0))
      .sort(([, a], [, b]) => b.comparedTo(a))
      .map(([accountId, amount]) => ({
        accountId,
        amount: amount.toFixed(0),
        share: total.gt(0) ? amount.dividedBy(total).toNumber() : 0,
      }));

    return {
      start: boundary.start,
      end: boundary.end,
      granularity,
      total: total.toFixed(0),
      accounts,
    };
  });
};

/** Planck total of the range — the figure printed under the header. */
export const getRangeTotal = (buckets: RewardBucket[]): string => {
  return buckets.reduce((sum, bucket) => sum.plus(bucket.total), new BigNumber(0)).toFixed(0);
};

/** Whether the range holds any reward at all. Drives the empty state. */
export const hasRewards = (buckets: RewardBucket[]): boolean => {
  return buckets.some((bucket) => new BigNumber(bucket.total).gt(0));
};
