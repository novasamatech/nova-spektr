import { BN } from '@polkadot/util';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidator } from '../validators/types';

import { MAX_PER_CLUSTER, SCORE_PRECISION } from './constants';
import { type IdentityParentMap, type RecommendationCriteria, type ScoreBreakdown } from './types';

export const recommendationsService = {
  recommendValidators,
  getScoreBreakdown,
};

/**
 * Picks the validators to nominate, mirroring Nova Wallet's recommender.
 *
 * 1. Blocked validators are dropped unconditionally - they reject nominations, so
 *    recommending them can never work.
 * 2. The relaxable filters of `criteria` are applied on top.
 * 3. If step 2 emptied the list, it is rebuilt with the mandatory filter only. The
 *    user is never shown an empty recommendation because their filters were too
 *    strict for the era.
 * 4. The survivors are ordered by APY, unknown APY last, ties keeping the input
 *    order.
 * 5. At most `MAX_PER_CLUSTER` validators of one identity cluster are kept.
 * 6. The result is cut to `criteria.limit`.
 */
function recommendValidators(
  validators: EraValidator[],
  identityParents: IdentityParentMap,
  criteria: RecommendationCriteria,
): EraValidator[] {
  const nominable = validators.filter(validator => !validator.blocked);
  const filtered = applyRelaxableFilters(nominable, identityParents, criteria);

  // Graceful degradation: strict criteria must never yield nothing.
  const candidates = filtered.length > 0 ? filtered : nominable;

  const sorted = sortByApy(candidates);
  const spread = criteria.limitClusters ? limitClusters(sorted, identityParents) : sorted;

  return spread.slice(0, Math.max(0, criteria.limit));
}

function applyRelaxableFilters(
  validators: EraValidator[],
  identityParents: IdentityParentMap,
  criteria: RecommendationCriteria,
): EraValidator[] {
  return validators.filter(validator => {
    if (criteria.excludeSlashed && validator.slashed) return false;
    if (criteria.excludeOversubscribed && validator.oversubscribed) return false;
    if (criteria.requireIdentity && getClusterKey(validator, identityParents) === null) return false;

    return true;
  });
}

/**
 * Descending APY. `null` APY means the chain reported no reward data - those go
 * last instead of being read as `0`. Equal values keep the input order, which
 * is pinned by an explicit index tiebreak rather than by engine sort
 * stability.
 */
function sortByApy(validators: EraValidator[]): EraValidator[] {
  return validators
    .map((validator, index) => ({ validator, index }))
    .sort((a, b) => compareApy(a.validator.apy, b.validator.apy) || a.index - b.index)
    .map(entry => entry.validator);
}

function compareApy(left: number | null, right: number | null): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  return right - left;
}

/**
 * Keeps at most `MAX_PER_CLUSTER` validators per identity cluster, walking the
 * already sorted list - so the ones kept are the best scoring of their cluster.
 * Validators without an identity have no cluster to share and are all kept.
 */
function limitClusters(validators: EraValidator[], identityParents: IdentityParentMap): EraValidator[] {
  const usedByCluster = new Map<AccountId, number>();

  return validators.filter(validator => {
    const cluster = getClusterKey(validator, identityParents);
    if (cluster === null) return true;

    const used = usedByCluster.get(cluster) ?? 0;
    if (used >= MAX_PER_CLUSTER) return false;

    usedByCluster.set(cluster, used + 1);

    return true;
  });
}

function getClusterKey(validator: EraValidator, identityParents: IdentityParentMap): AccountId | null {
  return identityParents[validator.accountId] ?? null;
}

/**
 * Explains a recommendation: each metric of `validator` normalised to `0..1`
 * against `all`, so the UI can render comparable bars.
 *
 * A metric whose reference set carries no signal at all - empty set, every
 * value zero - scores `0` for everyone rather than dividing by zero.
 */
function getScoreBreakdown(validator: EraValidator, all: EraValidator[]): ScoreBreakdown {
  return {
    commission: getCommissionScore(validator, all),
    selfStake: getSelfStakeScore(validator, all),
    blockProduction: getBlockProductionScore(validator, all),
    eraPoints: getEraPointsScore(validator, all),
  };
}

/**
 * Inverted - the cheapest validator of the set scores `1`.
 *
 * Unlike the other metrics, an all-zero set is not a missing-data case: a 0%
 * commission is the best possible value, so everyone scores `1` rather than the
 * `0` a plain zero-division guard would produce. An empty set is still missing
 * data and scores `0`.
 */
function getCommissionScore(validator: EraValidator, all: EraValidator[]): number {
  if (all.length === 0) return 0;

  const maxCommission = getMaxNumber(all.map(v => v.commission));
  if (maxCommission <= 0) return 1;

  return clampScore(1 - validator.commission / maxCommission);
}

/** Self stake is a planck string - it overflows `Number`, so compare with BN. */
function getSelfStakeScore(validator: EraValidator, all: EraValidator[]): number {
  const own = parseStake(validator.ownStake);
  const maxOwn = all.reduce((max, v) => {
    const stake = parseStake(v.ownStake);

    return stake.gt(max) ? stake : max;
  }, new BN(0));

  if (maxOwn.isZero()) return 0;

  return clampScore(own.muln(SCORE_PRECISION).div(maxOwn).toNumber() / SCORE_PRECISION);
}

/**
 * Authored blocks are only readable on chains with the `imOnline` pallet. When
 * the whole set reports `null`, era points stand in as the liveness proxy.
 */
function getBlockProductionScore(validator: EraValidator, all: EraValidator[]): number {
  const blocksKnown = all.some(v => v.blocksAuthored !== null);
  if (!blocksKnown) return getEraPointsScore(validator, all);

  const maxBlocks = getMaxNumber(all.map(v => v.blocksAuthored ?? 0));
  if (maxBlocks <= 0) return 0;

  return clampScore((validator.blocksAuthored ?? 0) / maxBlocks);
}

function getEraPointsScore(validator: EraValidator, all: EraValidator[]): number {
  const maxPoints = getMaxNumber(all.map(v => v.eraPoints));
  if (maxPoints <= 0) return 0;

  return clampScore(validator.eraPoints / maxPoints);
}

function parseStake(value: string): BN {
  try {
    return new BN(value);
  } catch {
    return new BN(0);
  }
}

function getMaxNumber(values: number[]): number {
  return values.reduce((max, value) => (Number.isFinite(value) && value > max ? value : max), 0);
}

/**
 * `all` is not required to contain `validator`, so a value can land outside the
 * reference range - the bars stay within `0..1` regardless.
 */
function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.min(1, Math.max(0, value));
}
