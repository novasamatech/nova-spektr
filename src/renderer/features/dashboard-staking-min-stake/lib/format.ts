import BigNumber from 'bignumber.js';

/**
 * Planck string → token units as a plain number. Display-only: the widget
 * compares and plots thresholds, it never does money arithmetic on the result.
 */
export const planckToTokens = (planck: string, precision: number): number => {
  return new BigNumber(planck).shiftedBy(-precision).toNumber();
};

// The locale is pinned rather than inherited from the system: the labels are
// asserted verbatim in tests, and the app ships English-only UI text today.
const group = (value: number): string => Math.round(value).toLocaleString('en-US');

/**
 * Per-era plot label. `formatBalance`'s M-shorthand prints the same "1.15M" for
 * all eight eras of a sub-1% band, so the plot keeps a K-notation precision
 * floor — "1,150.0K" vs "1,156.2K" — the one deliberate exception to the card
 * abbreviation rule, confirmed at design review. Values that would read as
 * "0.5K" fall back to plain integers.
 */
export const formatEraValue = (tokens: number): string => {
  if (tokens < 10_000) return group(tokens);

  const thousands = tokens / 1_000;

  return `${thousands.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
};

/** Full-precision token amount for the hover card — `1,149,983`, never `1.15M`. */
export const formatExactTokens = (tokens: number): string => group(tokens);

/** Signed full-precision delta — `+10,251` / `−6,246`. */
export const formatSignedTokens = (delta: number): string => {
  return `${delta < 0 ? '−' : '+'}${group(Math.abs(delta))}`;
};

/** Signed percent change of `value` against `base` — `+0.21%`. */
export const formatSignedPercent = (value: number, base: number): string => {
  const percent = ((value - base) / base) * 100;

  return `${percent < 0 ? '−' : '+'}${Math.abs(percent).toFixed(2)}%`;
};

/**
 * Axis gridline label, precision tied to the grid step: a 100K step reads fine
 * as "1.2M", a 5K step needs "1.155M" to tell neighbours apart. Values below a
 * million use K, below ten thousand plain integers.
 */
export const formatAxisValue = (value: number, step: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(step >= 100_000 ? 1 : 3)}M`;
  }
  if (value >= 10_000) {
    return `${(value / 1_000).toFixed(step >= 1_000 ? 0 : 1)}K`;
  }

  return group(value);
};
