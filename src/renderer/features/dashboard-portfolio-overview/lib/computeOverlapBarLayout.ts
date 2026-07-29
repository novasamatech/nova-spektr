import { type BalanceType, BALANCE_TYPES } from './balanceTypes';

export type OverlapBarLayout = {
  segments: { type: BalanceType; pct: number }[];
  /** `null` when there is no overlap — the bar needs no marker */
  overlapSpan: { left: number; width: number } | null;
};

/**
 * Geometry shared by the distribution bar and the detail-modal row bars: how a
 * four-type partition is rendered when part of the vesting rides on reserved
 * funds (see `vestingOverlapBN`).
 *
 * With an overlap the vested amount stops being a slice: it sits on top of
 * reserved, and of whatever it froze inside locked. So it folds back into the
 * segments it covers — keeping the bar a true partition — and is reported as a
 * span to draw a marker across instead. The span is contiguous and straddles
 * the reserved/locked boundary: it reaches left into reserved by the overlap,
 * and right into locked by the part that did freeze free funds. Clamped to the
 * bar; the caller still applies its own min-width floor, which percentages
 * alone don't know about.
 *
 * `hasOverlap` is the caller's presence test (it may know the raw amount is
 * non-zero even when the fiat share rounds to zero); a dust overlap then still
 * folds and yields a zero-width span for the floor to keep visible.
 */
export function computeOverlapBarLayout(params: {
  types: Record<BalanceType, number>;
  overlapPct: number;
  hasOverlap: boolean;
}): OverlapBarLayout {
  const { types, overlapPct, hasOverlap } = params;

  const segments = BALANCE_TYPES.flatMap((type) => {
    if (hasOverlap && type === 'vested') return [];

    const pct = hasOverlap && type === 'locked' ? types.locked + types.vested : types[type];

    return pct > 0 ? [{ type, pct }] : [];
  });

  const overlapSpan = hasOverlap
    ? {
        left: Math.max(0, types.transferable + types.reserved - overlapPct),
        width: Math.min(100, overlapPct + types.vested),
      }
    : null;

  return { segments, overlapSpan };
}
