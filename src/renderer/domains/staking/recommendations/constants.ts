import { type RecommendationCriteria } from './types';

/**
 * Strictest sensible defaults - every relaxable filter is on. The algorithm
 * relaxes them by itself when they leave nothing to recommend.
 */
export const DEFAULT_RECOMMENDATION_CRITERIA: Omit<RecommendationCriteria, 'limit'> = {
  excludeSlashed: true,
  requireIdentity: true,
  limitClusters: true,
};

/**
 * How much each metric moves the ranking. Sums to 1, so `overall` stays in
 * `0..1` and reads as a percentage of the best possible validator.
 *
 * APY leads because it is the return the user is actually buying, but it cannot
 * decide alone: a validator can post a high APY on a thin, volatile exposure or
 * behind a commission it is free to raise tomorrow. Commission is the second
 * weight because it is the one number the validator controls directly; self
 * stake is the operator's own risk in the position; era points are the liveness
 * evidence, weighted lowest because they move with the era and recover on their
 * own.
 *
 * Era points carry the weight that used to be split with a separate
 * block-production metric. Authored-block counts came from `imOnline`, which no
 * longer exists in the Polkadot runtime, and era points are the surviving
 * liveness signal - they pay for backing and approval as well as authoring.
 */
export const SCORE_WEIGHTS = {
  apy: 0.4,
  commission: 0.2,
  selfStake: 0.15,
  eraPoints: 0.25,
} as const;

/**
 * How many validators of the same identity cluster may enter one nomination.
 * Spreading the stake across operators limits the blast radius of a single
 * operator being slashed.
 */
export const MAX_PER_CLUSTER = 2;

/**
 * How far two identity display names may differ and still count as one
 * operator.
 *
 * Three edits is what the real variation between an operator's nodes costs: an
 * index that grew a digit (`_9` → `_14`), a swapped separator, a case change.
 * On its own it is not a test of anything - see `isSameOperator`, which also
 * requires the difference to sit in the tail rather than the stem.
 */
export const MAX_OPERATOR_NAME_DISTANCE = 3;
