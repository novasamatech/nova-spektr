import {
  formatAssetAmount,
  formatAssetAmountExact,
  formatAssetAmounts,
  nonZeroAmounts,
  sumFiat,
  sumPlanck,
} from '../amounts';

const DOT = { symbol: 'DOT', precision: 10 };
const KSM = { symbol: 'KSM', precision: 12 };

describe('per-asset amount formatting', () => {
  test('abbreviates a single amount with its symbol', () => {
    expect(formatAssetAmount({ ...DOT, amount: '53800000000000000' })).toBe('5.38M DOT');
  });

  test('joins assets instead of summing them', () => {
    const line = formatAssetAmounts([
      { ...DOT, amount: '53800000000000000' },
      { ...KSM, amount: '60000000000000000' },
    ]);

    expect(line).toBe('5.38M DOT + 60K KSM');
  });

  test('drops assets with nothing in them', () => {
    const line = formatAssetAmounts([
      { ...DOT, amount: '53800000000000000' },
      { ...KSM, amount: '0' },
    ]);

    expect(line).toBe('5.38M DOT');
  });

  test('prefixes rewards with a sign', () => {
    expect(formatAssetAmounts([{ ...DOT, amount: '712000000000000' }], { sign: '+' })).toBe('+71.2K DOT');
  });

  test('falls back when every asset is empty', () => {
    expect(formatAssetAmounts([{ ...DOT, amount: '0' }], { fallback: '—' })).toBe('—');
    expect(formatAssetAmounts([], { fallback: '—' })).toBe('—');
  });

  test('an empty line, not a fabricated zero, when no fallback is given', () => {
    expect(formatAssetAmounts([])).toBe('');
  });
});

describe('non-zero filter', () => {
  test('keeps source order', () => {
    const result = nonZeroAmounts([
      { ...DOT, amount: '0' },
      { ...KSM, amount: '5' },
      { ...DOT, amount: '7' },
    ]);

    expect(result.map((entry) => entry.amount)).toEqual(['5', '7']);
  });
});

describe('sums', () => {
  test('planck stays integral', () => {
    expect(sumPlanck(['1', '2', '3'])).toBe('6');
    expect(sumPlanck([])).toBe('0');
  });

  test('fiat keeps decimals', () => {
    expect(sumFiat(['1.5', '2.25'])).toBe('3.75');
  });
});

describe('formatAssetAmountExact', () => {
  it('spells out hundreds the card would abbreviate', () => {
    // `0.1K DOT` in a table row reads as a rounding error, and ten rows of it
    // cannot be compared at all.
    expect(formatAssetAmountExact({ symbol: 'DOT', precision: 10, amount: '940000000000' })).toBe('94 DOT');
  });

  it('still abbreviates millions — nobody compares eight digits', () => {
    expect(formatAssetAmountExact({ symbol: 'DOT', precision: 10, amount: '13490000000000000' })).toBe('1.34M DOT');
  });
});
