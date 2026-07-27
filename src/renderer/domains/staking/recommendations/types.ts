import { type AccountId } from '@/shared/polkadotjs-schemas';

/**
 * Knobs of the recommendation algorithm.
 *
 * Everything except `limitClusters` is a _relaxable_ filter: when the strict
 * pass leaves no candidate at all, the filters are dropped and the selection is
 * rebuilt from the mandatory pass only. `limitClusters` is not a filter but a
 * post-processor over the already sorted list, so it is never relaxed.
 */
export type RecommendationCriteria = {
  /** Drop validators carrying a slash inside the defer window. Relaxable. */
  excludeSlashed: boolean;
  /** Keep only validators with an on-chain identity. Relaxable. */
  requireIdentity: boolean;
  /** Drop validators whose exposure page is already full. Relaxable. */
  excludeOversubscribed: boolean;
  /** Keep at most `MAX_PER_CLUSTER` validators per identity cluster. */
  limitClusters: boolean;
  /** Maximum number of validators to return - the chain's `maxNominations`. */
  limit: number;
};

/**
 * Identity cluster key per validator:
 *
 * - The parent identity `accountId` for a sub-identity;
 * - The validator's own `accountId` for a root identity;
 * - `null` (or an absent entry) when the validator has no on-chain identity.
 *
 * Validators sharing a key belong to the same operator and compete for the same
 * cluster budget.
 */
export type IdentityParentMap = Record<AccountId, AccountId | null>;

/**
 * Per-metric contribution of a validator to its recommendation, each value
 * normalised to `0..1` against the set it was compared with. Feeds the "Why
 * recommended" card - it explains a pick, it does not produce one.
 */
export type ScoreBreakdown = {
  /** Lower commission scores higher. */
  commission: number;
  /** Self stake relative to the largest self stake in the set. */
  selfStake: number;
  /** Authored blocks relative to the set, era points when blocks are unknown. */
  blockProduction: number;
  /** Era reward points relative to the largest in the set. */
  eraPoints: number;
};
