import { RANGE_CONFIG, buildBucketBoundaries, buildBuckets, getRangeTotal, hasRewards } from '../buckets';
import { type RangeKey, type RewardRecordLike } from '../types';

/** Wednesday, 22 July 2026, 13:37 local time. */
const NOW = new Date(2026, 6, 22, 13, 37).getTime();

const identity = (address: string) => address;

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

const record = (date: Date, amount: string, address = 'alice'): RewardRecordLike => ({
  address,
  amount,
  timestamp: seconds(date),
});

const build = (range: RangeKey, records: RewardRecordLike[] = []) =>
  buildBuckets({ records, range, nowMs: NOW, resolveAccountId: identity });

describe('bucket boundaries', () => {
  test.each([
    ['7d', 7],
    ['30d', 30],
    ['90d', 13],
    ['1y', 12],
  ] as const)('%s produces %i bars', (range, count) => {
    expect(buildBucketBoundaries(range, NOW)).toHaveLength(count);
    expect(build(range)).toHaveLength(count);
  });

  test('daily bars are calendar days ending with today', () => {
    const boundaries = buildBucketBoundaries('7d', NOW);

    expect(new Date(boundaries[0]!.start)).toEqual(new Date(2026, 6, 16));
    expect(new Date(boundaries[6]!.start)).toEqual(new Date(2026, 6, 22));
    expect(boundaries[6]!.end).toEqual(new Date(2026, 6, 23).getTime());
  });

  test('bars are contiguous — no gap or overlap between them', () => {
    for (const range of ['7d', '30d', '90d', '1y'] as const) {
      const boundaries = buildBucketBoundaries(range, NOW);

      for (let index = 1; index < boundaries.length; index++) {
        expect(boundaries[index]!.start).toEqual(boundaries[index - 1]!.end);
      }
    }
  });

  test('weekly bars start on Monday and cover 13 weeks back', () => {
    const boundaries = buildBucketBoundaries('90d', NOW);

    // 22 Jul 2026 is a Wednesday — its week starts Monday 20 Jul.
    expect(new Date(boundaries[12]!.start)).toEqual(new Date(2026, 6, 20));
    expect(new Date(boundaries[0]!.start)).toEqual(new Date(2026, 3, 27));
    expect(new Date(boundaries[0]!.start).getDay()).toEqual(1);
  });

  test('monthly bars are calendar months ending with the current one', () => {
    const boundaries = buildBucketBoundaries('1y', NOW);

    expect(new Date(boundaries[11]!.start)).toEqual(new Date(2026, 6, 1));
    expect(new Date(boundaries[0]!.start)).toEqual(new Date(2025, 7, 1));
  });

  test('granularity is carried on every bucket', () => {
    for (const range of ['7d', '30d', '90d', '1y'] as const) {
      const [first] = build(range);
      expect(first?.granularity).toEqual(RANGE_CONFIG[range].granularity);
    }
  });
});

describe('record placement', () => {
  test('a reward lands in the day it was paid', () => {
    const buckets = build('7d', [record(new Date(2026, 6, 18, 9, 0), '100')]);

    expect(buckets.map((bucket) => bucket.total)).toEqual(['0', '0', '100', '0', '0', '0', '0']);
  });

  test('the first millisecond of a day belongs to that day, the last to the previous', () => {
    const buckets = build('7d', [
      record(new Date(2026, 6, 18, 0, 0, 0), '10'),
      record(new Date(2026, 6, 17, 23, 59, 59), '5'),
    ]);

    expect(buckets[1]?.total).toEqual('5');
    expect(buckets[2]?.total).toEqual('10');
  });

  test('rewards older than the range are dropped, not folded into the first bar', () => {
    const buckets = build('7d', [record(new Date(2026, 5, 1), '999'), record(new Date(2026, 6, 20), '7')]);

    expect(getRangeTotal(buckets)).toEqual('7');
  });

  test('a week bucket sums every day of that week', () => {
    const buckets = build('90d', [
      record(new Date(2026, 6, 20), '1'),
      record(new Date(2026, 6, 22), '2'),
      record(new Date(2026, 6, 26, 23, 0), '3'),
    ]);

    expect(buckets[12]?.total).toEqual('6');
  });

  test('a month bucket sums every day of that month', () => {
    const buckets = build('1y', [
      record(new Date(2026, 5, 1), '4'),
      record(new Date(2026, 5, 30), '6'),
      record(new Date(2026, 6, 1), '1'),
    ]);

    expect(buckets[10]?.total).toEqual('10');
    expect(buckets[11]?.total).toEqual('1');
  });

  test('planck sums stay exact beyond float precision', () => {
    const buckets = build('7d', [
      record(new Date(2026, 6, 22), '90071992547409910'),
      record(new Date(2026, 6, 22), '1'),
    ]);

    expect(buckets[6]?.total).toEqual('90071992547409911');
  });
});

describe('per-account breakdown', () => {
  const buckets = build('7d', [
    record(new Date(2026, 6, 22), '25', 'alice'),
    record(new Date(2026, 6, 22), '50', 'bob'),
    record(new Date(2026, 6, 22), '25', 'alice'),
  ]);

  const today = buckets[6]!;

  test('accounts are merged and ordered by size', () => {
    expect(today.accounts.map((entry) => entry.accountId)).toEqual(['alice', 'bob']);
    expect(today.accounts.map((entry) => entry.amount)).toEqual(['50', '50']);
  });

  test('shares are fractions of the bucket total and sum to one', () => {
    expect(today.accounts.map((entry) => entry.share)).toEqual([0.5, 0.5]);
    expect(today.accounts.reduce((sum, entry) => sum + entry.share, 0)).toBeCloseTo(1);
  });

  test('an empty bucket lists no accounts and no shares', () => {
    expect(buckets[0]?.accounts).toEqual([]);
    expect(buckets[0]?.total).toEqual('0');
  });
});

describe('empty history', () => {
  test('every range still renders its full set of empty bars', () => {
    for (const range of ['7d', '30d', '90d', '1y'] as const) {
      const buckets = build(range);

      expect(buckets).toHaveLength(RANGE_CONFIG[range].count);
      expect(buckets.every((bucket) => bucket.total === '0')).toEqual(true);
      expect(hasRewards(buckets)).toEqual(false);
      expect(getRangeTotal(buckets)).toEqual('0');
    }
  });

  test('a single non-zero bar counts as data', () => {
    expect(hasRewards(build('30d', [record(new Date(2026, 6, 22), '1')]))).toEqual(true);
  });
});

describe('total line', () => {
  test('the printed total is the sum of the visible bars', () => {
    const buckets = build('30d', [
      record(new Date(2026, 6, 22), '100'),
      record(new Date(2026, 6, 10), '250'),
      record(new Date(2026, 5, 25), '30'),
    ]);

    expect(getRangeTotal(buckets)).toEqual('380');
    expect(getRangeTotal(buckets)).toEqual(buckets.reduce((sum, bucket) => sum + Number(bucket.total), 0).toString());
  });

  test('the same records give a bigger total on a wider range', () => {
    const records = [record(new Date(2026, 6, 22), '10'), record(new Date(2026, 1, 2), '90')];

    expect(getRangeTotal(build('30d', records))).toEqual('10');
    expect(getRangeTotal(build('1y', records))).toEqual('100');
  });
});
