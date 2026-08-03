import { buildBuckets } from '../buckets';
import { defaultDateFormatter, formatAxisLabel, formatBucketDate } from '../labels';
import { type RangeKey } from '../types';

/** Wednesday, 22 July 2026. */
const NOW = new Date(2026, 6, 22, 13, 37).getTime();

const build = (range: RangeKey) =>
  buildBuckets({ records: [], range, nowMs: NOW, resolveAccountId: (address) => address });

const axis = (range: RangeKey) =>
  build(range).map((bucket, index) => formatAxisLabel(bucket, index, defaultDateFormatter));

describe('x axis labels', () => {
  test('daily bars are dated', () => {
    expect(axis('7d').map((label) => label.primary)).toEqual([
      'Jul 16',
      'Jul 17',
      'Jul 18',
      'Jul 19',
      'Jul 20',
      'Jul 21',
      'Jul 22',
    ]);
  });

  test('daily bars carry no second line', () => {
    expect(axis('7d').every((label) => label.secondary === null)).toEqual(true);
  });

  test('weekly bars are dated by the week start', () => {
    const labels = axis('90d');

    expect(labels[12]?.primary).toEqual('Jul 20');
    expect(labels[12]?.secondary).toEqual(null);
  });

  test('yearly bars are month names', () => {
    expect(axis('1y').map((label) => label.primary)).toEqual([
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
    ]);
  });

  test('the year is printed on the first bar and again in January', () => {
    const withYear = axis('1y')
      .map((label, index) => ({ index, primary: label.primary, secondary: label.secondary }))
      .filter((label) => label.secondary !== null);

    expect(withYear).toEqual([
      { index: 0, primary: 'Aug', secondary: '2025' },
      { index: 5, primary: 'Jan', secondary: '2026' },
    ]);
  });

  test('a window inside one calendar year still labels its first bar', () => {
    const buckets = buildBuckets({
      records: [],
      range: '1y',
      nowMs: new Date(2026, 11, 15).getTime(),
      resolveAccountId: (address) => address,
    });
    const labels = buckets.map((bucket, index) => formatAxisLabel(bucket, index, defaultDateFormatter));

    expect(labels[0]).toEqual({ primary: 'Jan', secondary: '2026' });
    expect(labels.filter((label) => label.secondary !== null)).toHaveLength(1);
  });
});

describe('tooltip date', () => {
  test('a day is a short date', () => {
    expect(formatBucketDate(build('7d')[2]!, defaultDateFormatter)).toEqual('Jul 18');
  });

  test('a week is dated by its Monday', () => {
    expect(formatBucketDate(build('90d')[12]!, defaultDateFormatter)).toEqual('Jul 20');
  });

  test('a month spells the month and the year', () => {
    expect(formatBucketDate(build('1y')[11]!, defaultDateFormatter)).toEqual('July 2026');
  });
});
