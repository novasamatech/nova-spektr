import { buildBuckets } from '../buckets';
import { type RewardsEraAnchor, deriveEraAt, resolveBucketEra } from '../era';
import { type RangeKey } from '../types';

const NOW = new Date(2026, 6, 22, 13, 37).getTime();

const DAY = 24 * 60 * 60 * 1000;

/** Polkadot-shaped anchor: era 1710 started at midday today, eras last a day. */
const anchor: RewardsEraAnchor = {
  era: 1710,
  eraStartMs: new Date(2026, 6, 22, 12, 0).getTime(),
  eraDurationMs: DAY,
};

/** Kusama-shaped anchor: four eras a day. */
const shortAnchor: RewardsEraAnchor = { ...anchor, era: 8000, eraDurationMs: DAY / 4 };

const build = (range: RangeKey) =>
  buildBuckets({ records: [], range, nowMs: NOW, resolveAccountId: (address) => address });

describe('deriveEraAt', () => {
  test('the anchor moment is the anchored era', () => {
    expect(deriveEraAt(anchor, anchor.eraStartMs)).toEqual(1710);
  });

  test('one era back is the previous era', () => {
    expect(deriveEraAt(anchor, anchor.eraStartMs - DAY)).toEqual(1709);
    expect(deriveEraAt(anchor, anchor.eraStartMs - 1)).toEqual(1709);
  });

  test('four days back is four eras back', () => {
    expect(deriveEraAt(anchor, anchor.eraStartMs - 4 * DAY)).toEqual(1706);
  });

  test('no anchor means no era', () => {
    expect(deriveEraAt(null, NOW)).toEqual(null);
  });

  test('a zero-length era is refused rather than divided by', () => {
    expect(deriveEraAt({ ...anchor, eraDurationMs: 0 }, NOW)).toEqual(null);
  });

  test('walking back past genesis yields nothing', () => {
    expect(deriveEraAt({ ...anchor, era: 2 }, anchor.eraStartMs - 10 * DAY)).toEqual(null);
  });
});

describe('resolveBucketEra', () => {
  test('a day names the era in effect at its middle', () => {
    const buckets = build('7d');

    // Bars are Jul 16..22; midday of Jul 22 is exactly the era-1710 anchor.
    expect(resolveBucketEra(buckets[6]!, anchor)).toEqual(1710);
    expect(resolveBucketEra(buckets[5]!, anchor)).toEqual(1709);
    expect(resolveBucketEra(buckets[0]!, anchor)).toEqual(1704);
  });

  test('a week is never labelled with a single era', () => {
    expect(resolveBucketEra(build('90d')[12]!, anchor)).toEqual(null);
  });

  test('a month is never labelled with a single era', () => {
    expect(resolveBucketEra(build('1y')[11]!, anchor)).toEqual(null);
  });

  test('a day covered by several eras is left unlabelled instead of guessing', () => {
    expect(resolveBucketEra(build('7d')[6]!, shortAnchor)).toEqual(null);
  });

  test('without an anchor no bucket carries an era', () => {
    for (const range of ['7d', '30d', '90d', '1y'] as const) {
      expect(build(range).every((bucket) => resolveBucketEra(bucket, null) === null)).toEqual(true);
    }
  });
});
