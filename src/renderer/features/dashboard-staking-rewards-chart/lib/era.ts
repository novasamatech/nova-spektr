import { type RewardBucket } from './types';

/**
 * A known era plus the moment it started and how long an era lasts on that
 * chain — everything needed to walk backwards to an earlier era.
 */
export type RewardsEraAnchor = {
  era: number;
  /** Unix ms the anchored era became active. */
  eraStartMs: number;
  eraDurationMs: number;
};

/**
 * Era in effect at `timestampMs`, walked back from the anchor. `null` when the
 * anchor is unusable or the walk lands before era 0 — never a guess.
 */
export const deriveEraAt = (anchor: RewardsEraAnchor | null, timestampMs: number): number | null => {
  if (!anchor || anchor.eraDurationMs <= 0) return null;

  const elapsed = timestampMs - anchor.eraStartMs;
  const offset = Math.floor(elapsed / anchor.eraDurationMs);
  const era = anchor.era + offset;

  return era >= 0 ? era : null;
};

/**
 * The era to print in a bucket's hover title, or `null` to print no era at all.
 *
 * Only daily buckets can name one: a week or a month spans dozens of eras, and
 * a single number there would be a fabrication. Even a day only qualifies when
 * one era is at least as long as the day — true for Polkadot's 24h eras, false
 * for chains with shorter ones, where the day would cover several eras and any
 * single label would be arbitrary.
 *
 * The label is the era active at the **middle** of the day, since era
 * boundaries do not align with midnight.
 */
export const resolveBucketEra = (bucket: RewardBucket, anchor: RewardsEraAnchor | null): number | null => {
  if (!anchor || bucket.granularity !== 'day') return null;
  if (anchor.eraDurationMs < bucket.end - bucket.start) return null;

  return deriveEraAt(anchor, bucket.start + (bucket.end - bucket.start) / 2);
};
