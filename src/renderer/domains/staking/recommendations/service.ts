import { BN } from '@polkadot/util';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidator } from '../validators/types';

import { MAX_PER_CLUSTER, SCORE_WEIGHTS } from './constants';
import { type IdentityParentMap, type RecommendationCriteria, type ScoreBreakdown } from './types';

export const recommendationsService = {
  recommendValidators,
  getScoreBreakdown,
  getScoreBreakdowns,
};

/**
 * Picks the validators to nominate.
 *
 * 1. Blocked validators are dropped unconditionally - they reject nominations, so
 *    recommending them can never work.
 * 2. The relaxable filters of `criteria` are applied on top.
 * 3. If step 2 emptied the list, it is rebuilt with the mandatory filter only. The
 *    user is never shown an empty recommendation because their filters were too
 *    strict for the era.
 * 4. The survivors are ordered by their `overall` score - the weighted blend of
 *    APY, commission, self stake, block production and era points described by
 *    `SCORE_WEIGHTS`. Ties keep the input order.
 * 5. At most `MAX_PER_CLUSTER` validators of one identity cluster are kept.
 * 6. The result is cut to `criteria.limit`.
 *
 * Scores are normalised against the candidate set, so the ranking answers "best
 * of what is electable this era", not "good by some absolute standard".
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

  const sorted = sortByScore(candidates);
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
    if (criteria.requireIdentity && getClusterKey(validator, identityParents) === null) return false;

    return true;
  });
}

/**
 * Descending `overall` score, each validator scored against the candidate set
 * it competes in. Equal scores keep the input order, which is pinned by an
 * explicit index tiebreak rather than by engine sort stability.
 */
function sortByScore(validators: EraValidator[]): EraValidator[] {
  const score = createScorer(validators);

  return validators
    .map((validator, index) => ({ validator, index, score: score(validator).overall }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(entry => entry.validator);
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
 * against `all`, plus the weighted `overall` the ranking actually sorts by.
 *
 * The same function feeds both the ordering and the "Why recommended" card, so
 * the bars a user reads are the numbers that produced the pick.
 *
 * A metric whose reference set carries no signal at all - empty set, every
 * value zero - scores `0` for everyone rather than dividing by zero.
 */
function getScoreBreakdown(validator: EraValidator, all: EraValidator[]): ScoreBreakdown {
  return createScorer(all)(validator);
}

/**
 * Every validator of the set scored against the set, in one pass.
 *
 * Calling `getScoreBreakdown` per row would rebuild the normalisation reference
 * each time - quadratic over a ~600-validator era, and re-parsing every self
 * stake as a BN on each rebuild.
 */
function getScoreBreakdowns(validators: EraValidator[]): Record<AccountId, ScoreBreakdown> {
  const score = createScorer(validators);

  const result: Record<AccountId, ScoreBreakdown> = {};
  for (const validator of validators) {
    result[validator.accountId] = score(validator);
  }

  return result;
}

/**
 * The normalisation reference of one candidate set: the best value of each
 * metric, read in a single pass.
 *
 * Ranking scores every validator against every other, so recomputing the maxima
 * per validator would be quadratic - and `ownStake` is a planck string, so it
 * would also re-parse ~600 BNs per validator on Polkadot. The reference is
 * built once and closed over instead.
 */
function createScorer(all: EraValidator[]): (validator: EraValidator) => ScoreBreakdown {
  const empty = all.length === 0;

  const maxApy = getMaxNumber(all.map(v => v.apy ?? 0));
  const maxCommission = getMaxNumber(all.map(v => v.commission));
  const maxPoints = getMaxNumber(all.map(v => v.eraPoints));

  // Self stake is scored on a log scale against the smallest bond in the set,
  // not linearly against the largest. Linear normalisation is wrong for a
  // quantity that spans orders of magnitude: on Polkadot Asset Hub one operator
  // self-bonds ~1.1M DOT while most sit at the 10k minimum, so every ordinary
  // validator collapsed to 0 - reading as "no skin in the game" for a bond that
  // is very much real.
  //
  // Anchoring on the smallest bond makes the metric unit-free and gives it a
  // meaning: how far above the era's floor the operator is willing to go. The
  // floor itself scores just over a tenth, and each further multiple of it adds
  // a comparable step, so the whole field spreads instead of piling up at zero.
  const stakes = all.map(v => parseStake(v.ownStake)).filter(stake => !stake.isZero());
  const minOwn = stakes.reduce((min, stake) => (stake.lt(min) ? stake : min), stakes[0] ?? new BN(0));
  const maxOwn = stakes.reduce((max, stake) => (stake.gt(max) ? stake : max), new BN(0));

  // Zero when nobody staked anything; log1p(1) when every bond is equal, which
  // scores the whole set 1 - each of them is the best of the set.
  const ownSpan = Math.log1p(getRatio(maxOwn, minOwn));

  return (validator: EraValidator): ScoreBreakdown => {
    const apy = maxApy <= 0 ? 0 : clampScore((validator.apy ?? 0) / maxApy);

    // Inverted - the cheapest validator of the set scores `1`. Unlike the other
    // metrics, an all-zero set is not a missing-data case: a 0% commission is
    // the best possible value, so everyone scores `1` rather than the `0` a
    // plain zero-division guard would produce. An empty set is still missing
    // data and scores `0`.
    const commission = empty ? 0 : maxCommission <= 0 ? 1 : clampScore(1 - validator.commission / maxCommission);

    const selfStake =
      ownSpan <= 0 ? 0 : clampScore(Math.log1p(getRatio(parseStake(validator.ownStake), minOwn)) / ownSpan);

    const eraPoints = maxPoints <= 0 ? 0 : clampScore(validator.eraPoints / maxPoints);

    const overall = clampScore(
      apy * SCORE_WEIGHTS.apy +
        commission * SCORE_WEIGHTS.commission +
        selfStake * SCORE_WEIGHTS.selfStake +
        eraPoints * SCORE_WEIGHTS.eraPoints,
    );

    return { apy, commission, selfStake, eraPoints, overall };
  };
}

function parseStake(value: string): BN {
  try {
    return new BN(value);
  } catch {
    return new BN(0);
  }
}

/**
 * `value / reference` as a plain number.
 *
 * The operands are planck strings that overflow `Number.MAX_SAFE_INTEGER`, but
 * their _ratio_ is what the score needs, and a double carries it to ~15
 * significant digits - far past the ten buckets the score is rendered in. Two
 * bonds a planck apart therefore score identically, which is the intent: that
 * is 1e-10 DOT of difference in "how much does this operator risk".
 */
function getRatio(value: BN, reference: BN): number {
  if (reference.isZero()) return 0;

  const ratio = Number(value.toString()) / Number(reference.toString());

  return Number.isFinite(ratio) ? ratio : 0;
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
