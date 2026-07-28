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
 * stake is the operator's own risk in the position; block production and era
 * points are the liveness evidence, weighted lower because they move with the
 * era and recover on their own.
 */
export const SCORE_WEIGHTS = {
  apy: 0.4,
  commission: 0.2,
  selfStake: 0.15,
  blockProduction: 0.15,
  eraPoints: 0.1,
} as const;

/**
 * How many validators of the same identity cluster may enter one nomination.
 * Spreading the stake across operators limits the blast radius of a single
 * operator being slashed.
 */
export const MAX_PER_CLUSTER = 2;

/**
 * Fixed-point scale used to turn integer BN division into a `0..1` ratio.
 */
export const SCORE_PRECISION = 10_000;
