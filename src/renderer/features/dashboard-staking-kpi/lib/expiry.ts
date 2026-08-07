/**
 * A staking payout can only be claimed for the last `HistoryDepth` eras. Once
 * an era falls out of that window the reward is gone for good, which is what
 * the claim modal's "oldest expires in" line and the positions table's expiry
 * badge warn about.
 *
 * Only a fallback for a chain whose api is not connected — 84 is the value both
 * Polkadot and Kusama run today. The live figure comes from
 * `useChainHistoryDepths`, so the countdown matches the eras the payout scan
 * actually searches.
 */
export const DEFAULT_CLAIM_WINDOW_ERAS = 84;

/**
 * Eras left before `payoutEra` drops out of the claim window. Never negative.
 *
 * The window is inclusive of its oldest era: the scan runs over `[activeEra −
 * historyDepth, activeEra − 1]`, so era `E` is still claimable when `activeEra
 * === E + historyDepth`, which is one era more than the plain difference
 * suggests.
 */
export function erasUntilExpiry(
  payoutEra: number,
  activeEra: number,
  historyDepth: number = DEFAULT_CLAIM_WINDOW_ERAS,
): number {
  return Math.max(0, historyDepth - (activeEra - payoutEra) + 1);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Eras converted to days through the chain's era duration. `null` when the
 * chain cannot supply one.
 *
 * Deliberately not falling back to "one era per day": that holds on Polkadot
 * but not on Kusama, where eras are 6 hours, so the guess would report a reward
 * expiring in 21 days as 84 days away — and colour the chip green for it. A
 * missing countdown is honest; a confidently wrong one is not.
 */
export function daysUntilExpiry(erasLeft: number, eraDurationMs: number | null): number | null {
  if (!eraDurationMs || eraDurationMs <= 0) return null;

  return Math.max(0, Math.floor((erasLeft * eraDurationMs) / DAY_MS));
}

/**
 * The soonest expiry across a set of payout eras — the one the chip has to warn
 * about. `null` when there is nothing unclaimed.
 */
export function oldestPayoutEra(eras: number[]): number | null {
  if (eras.length === 0) return null;

  return Math.min(...eras);
}

/** The era anchor a date is derived from — when the active era started. */
export type EraTimeAnchor = {
  activeEra: number;
  eraStartMs: number;
  eraDurationMs: number;
};

/**
 * When an era **started**, in unix ms, walked back from the active era's own
 * start.
 *
 * "Era 1,704" means nothing to anyone reading a card; "earned around 2 July" is
 * the same fact in the unit people actually hold money in. Derived, never
 * guessed: without an anchor the caller gets `null` and prints the era count it
 * already had.
 */
export function eraStartedAt(era: number, anchor: EraTimeAnchor | null): number | null {
  if (!anchor || anchor.eraDurationMs <= 0) return null;

  return anchor.eraStartMs - (anchor.activeEra - era) * anchor.eraDurationMs;
}

/**
 * When an era's payout stops being claimable — the moment it falls out of the
 * `historyDepth` window.
 *
 * The window is inclusive of its oldest era (see {@link erasUntilExpiry}), so
 * the deadline is the start of the era that finally pushes it out.
 */
export function eraExpiresAt(
  era: number,
  anchor: EraTimeAnchor | null,
  historyDepth: number = DEFAULT_CLAIM_WINDOW_ERAS,
): number | null {
  return eraStartedAt(era + historyDepth + 1, anchor);
}
