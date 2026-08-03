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
