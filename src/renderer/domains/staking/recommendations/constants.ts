import { type RecommendationCriteria } from './types';

/**
 * Strictest sensible defaults - every relaxable filter is on. The algorithm
 * relaxes them by itself when they leave nothing to recommend.
 */
export const DEFAULT_RECOMMENDATION_CRITERIA: Omit<RecommendationCriteria, 'limit'> = {
  excludeSlashed: true,
  requireIdentity: true,
  excludeOversubscribed: true,
  limitClusters: true,
};

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
