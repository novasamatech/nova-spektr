import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidator } from '../../validators/types';
import { DEFAULT_RECOMMENDATION_CRITERIA, MAX_PER_CLUSTER, SCORE_WEIGHTS } from '../constants';
import { recommendationsService } from '../service';
import { type IdentityParentMap, type RecommendationCriteria } from '../types';

const alice = '0x01' as AccountId;
const bob = '0x02' as AccountId;
const charlie = '0x03' as AccountId;
const dave = '0x04' as AccountId;
const eve = '0x05' as AccountId;
const operator = '0xff' as AccountId;
const otherOperator = '0xfe' as AccountId;

function createValidator(accountId: AccountId, overrides: Partial<EraValidator> = {}): EraValidator {
  return {
    accountId,
    totalStake: '0',
    ownStake: '0',
    commission: 0,
    blocked: false,
    nominatorCount: 0,
    pageCount: 0,
    maxNominatorsRewarded: 512,
    slashed: false,
    eraPoints: 0,
    apy: null,
    elected: true,
    ...overrides,
  };
}

function createCriteria(overrides: Partial<RecommendationCriteria> = {}): RecommendationCriteria {
  return { ...DEFAULT_RECOMMENDATION_CRITERIA, limit: 16, ...overrides };
}

/** Every relaxable filter off, clustering off - the mandatory pass alone. */
function createOpenCriteria(overrides: Partial<RecommendationCriteria> = {}): RecommendationCriteria {
  return createCriteria({
    excludeSlashed: false,
    requireIdentity: false,
    limitClusters: false,
    ...overrides,
  });
}

/** Root identities - each validator is its own cluster. */
function createRootIdentities(...accountIds: AccountId[]): IdentityParentMap {
  return Object.fromEntries(accountIds.map(accountId => [accountId, accountId]));
}

function getIds(validators: EraValidator[]): AccountId[] {
  return validators.map(validator => validator.accountId);
}

describe('recommendationsService.recommendValidators', () => {
  describe('mandatory filter', () => {
    it('should always drop blocked validators, even with every relaxable filter off', () => {
      const validators = [createValidator(alice, { blocked: true }), createValidator(bob)];

      const result = recommendationsService.recommendValidators(validators, {}, createOpenCriteria());

      expect(getIds(result)).toEqual([bob]);
    });

    it('should keep blocked validators out of the degraded re-run', () => {
      // Every non-blocked validator is filtered out by the strict criteria, so
      // the degraded pass runs - it must still refuse the blocked one.
      const validators = [createValidator(alice, { blocked: true }), createValidator(bob, { slashed: true })];

      const result = recommendationsService.recommendValidators(
        validators,
        createRootIdentities(bob),
        createCriteria(),
      );

      expect(getIds(result)).toEqual([bob]);
    });

    it('should return nothing when every validator is blocked', () => {
      const validators = [createValidator(alice, { blocked: true }), createValidator(bob, { blocked: true })];

      const result = recommendationsService.recommendValidators(
        validators,
        createRootIdentities(alice, bob),
        createCriteria(),
      );

      expect(result).toEqual([]);
    });
  });

  describe('relaxable filters', () => {
    const identities = createRootIdentities(alice, bob, charlie);

    it('should drop slashed validators when excludeSlashed is on', () => {
      const validators = [createValidator(alice, { slashed: true }), createValidator(bob), createValidator(charlie)];

      const result = recommendationsService.recommendValidators(
        validators,
        identities,
        createOpenCriteria({ excludeSlashed: true }),
      );

      expect(getIds(result)).toEqual([bob, charlie]);
    });

    it('should keep slashed validators when excludeSlashed is off', () => {
      const validators = [createValidator(alice, { slashed: true }), createValidator(bob)];

      const result = recommendationsService.recommendValidators(validators, identities, createOpenCriteria());

      expect(getIds(result)).toEqual([alice, bob]);
    });

    it('should drop validators without identity when requireIdentity is on', () => {
      const validators = [createValidator(alice), createValidator(bob), createValidator(charlie)];
      // alice has a root identity, bob is explicitly identity-less, charlie is absent.
      const parents: IdentityParentMap = { [alice]: alice, [bob]: null };

      const result = recommendationsService.recommendValidators(
        validators,
        parents,
        createOpenCriteria({ requireIdentity: true }),
      );

      expect(getIds(result)).toEqual([alice]);
    });

    it('should treat a sub-identity as having an identity', () => {
      const validators = [createValidator(alice)];
      const parents: IdentityParentMap = { [alice]: operator };

      const result = recommendationsService.recommendValidators(
        validators,
        parents,
        createOpenCriteria({ requireIdentity: true }),
      );

      expect(getIds(result)).toEqual([alice]);
    });

    it('should apply every relaxable filter together', () => {
      const validators = [
        createValidator(alice, { slashed: true }),
        createValidator(bob, { slashed: true }),
        createValidator(charlie),
        createValidator(dave),
      ];
      const parents: IdentityParentMap = { [alice]: alice, [bob]: bob, [charlie]: charlie };

      const result = recommendationsService.recommendValidators(validators, parents, createCriteria());

      expect(getIds(result)).toEqual([charlie]);
    });
  });

  describe('graceful degradation', () => {
    it('should relax every relaxable filter when the strict pass is empty', () => {
      const validators = [
        createValidator(alice, { slashed: true, apy: 5 }),
        createValidator(bob, { slashed: true, apy: 9 }),
      ];

      const result = recommendationsService.recommendValidators(validators, {}, createCriteria());

      expect(getIds(result)).toEqual([bob, alice]);
    });

    it('should not degrade when at least one validator survives the strict pass', () => {
      const validators = [createValidator(alice, { slashed: true }), createValidator(bob)];

      const result = recommendationsService.recommendValidators(
        validators,
        createRootIdentities(bob),
        createCriteria(),
      );

      expect(getIds(result)).toEqual([bob]);
    });

    it('should still cap clusters in the degraded pass', () => {
      const validators = [
        createValidator(alice, { slashed: true, apy: 9 }),
        createValidator(bob, { slashed: true, apy: 8 }),
        createValidator(charlie, { slashed: true, apy: 7 }),
      ];
      const parents: IdentityParentMap = { [alice]: operator, [bob]: operator, [charlie]: operator };

      const result = recommendationsService.recommendValidators(validators, parents, createCriteria());

      expect(getIds(result)).toEqual([alice, bob]);
    });
  });

  describe('ordering', () => {
    it('should let a cheaper, better-run validator outrank a higher apy', () => {
      // APY carries 0.4 of the score, the other three carry 0.6 together, so a
      // validator that wins every one of them beats a 20%-better APY. This is
      // the whole point of ranking on a blend: a headline APY earned behind a
      // large commission is not the same offer as one earned without it.
      const validators = [
        createValidator(alice, { apy: 12, commission: 20, ownStake: '1', eraPoints: 10 }),
        createValidator(bob, { apy: 10, commission: 0, ownStake: '1000', eraPoints: 900 }),
      ];

      const result = recommendationsService.recommendValidators(validators, {}, createOpenCriteria());

      expect(getIds(result)).toEqual([bob, alice]);
    });

    it('should still put a clearly better apy first when the other metrics are close', () => {
      const validators = [
        createValidator(alice, { apy: 4, commission: 5, ownStake: '100', eraPoints: 100 }),
        createValidator(bob, { apy: 14, commission: 6, ownStake: '95', eraPoints: 95 }),
      ];

      const result = recommendationsService.recommendValidators(validators, {}, createOpenCriteria());

      expect(getIds(result)).toEqual([bob, alice]);
    });

    it('should rank on the metrics that remain when no apy is known at all', () => {
      const validators = [
        createValidator(alice, { apy: null, commission: 30, eraPoints: 10 }),
        createValidator(bob, { apy: null, commission: 0, eraPoints: 900 }),
      ];

      const result = recommendationsService.recommendValidators(validators, {}, createOpenCriteria());

      expect(getIds(result)).toEqual([bob, alice]);
    });

    it('should sort by apy descending when nothing else separates the validators', () => {
      const validators = [
        createValidator(alice, { apy: 3 }),
        createValidator(bob, { apy: 12.5 }),
        createValidator(charlie, { apy: 7 }),
      ];

      const result = recommendationsService.recommendValidators(validators, {}, createOpenCriteria());

      expect(getIds(result)).toEqual([bob, charlie, alice]);
    });

    it('should sort validators with unknown apy last among otherwise equal ones', () => {
      const validators = [
        createValidator(alice, { apy: null }),
        createValidator(bob, { apy: 1 }),
        createValidator(charlie, { apy: null }),
        createValidator(dave, { apy: 4 }),
      ];

      const result = recommendationsService.recommendValidators(validators, {}, createOpenCriteria());

      expect(getIds(result)).toEqual([dave, bob, alice, charlie]);
    });

    it('should keep the input order for equal apy', () => {
      const validators = [
        createValidator(charlie, { apy: 5 }),
        createValidator(alice, { apy: 5 }),
        createValidator(dave, { apy: 5 }),
        createValidator(bob, { apy: 5 }),
      ];

      const result = recommendationsService.recommendValidators(validators, {}, createOpenCriteria());

      expect(getIds(result)).toEqual([charlie, alice, dave, bob]);
    });

    it('should keep the input order for equally unknown apy', () => {
      const validators = [createValidator(dave), createValidator(bob), createValidator(alice)];

      const result = recommendationsService.recommendValidators(validators, {}, createOpenCriteria());

      expect(getIds(result)).toEqual([dave, bob, alice]);
    });
  });

  describe('cluster limit', () => {
    it('should keep only the two highest-apy validators of one cluster', () => {
      const validators = [
        createValidator(alice, { apy: 5 }),
        createValidator(bob, { apy: 10 }),
        createValidator(charlie, { apy: 7 }),
      ];
      const parents: IdentityParentMap = { [alice]: operator, [bob]: operator, [charlie]: operator };

      const result = recommendationsService.recommendValidators(
        validators,
        parents,
        createCriteria({ excludeSlashed: false }),
      );

      expect(result).toHaveLength(MAX_PER_CLUSTER);
      expect(getIds(result)).toEqual([bob, charlie]);
    });

    it('should budget every cluster separately', () => {
      const validators = [
        createValidator(alice, { apy: 9 }),
        createValidator(bob, { apy: 8 }),
        createValidator(charlie, { apy: 7 }),
        createValidator(dave, { apy: 6 }),
        createValidator(eve, { apy: 5 }),
      ];
      const parents: IdentityParentMap = {
        [alice]: operator,
        [bob]: operator,
        [charlie]: operator,
        [dave]: otherOperator,
        [eve]: otherOperator,
      };

      const result = recommendationsService.recommendValidators(validators, parents, createCriteria());

      expect(getIds(result)).toEqual([alice, bob, dave, eve]);
    });

    it('should treat root identities as separate clusters', () => {
      const validators = [
        createValidator(alice, { apy: 9 }),
        createValidator(bob, { apy: 8 }),
        createValidator(charlie, { apy: 7 }),
      ];

      const result = recommendationsService.recommendValidators(
        validators,
        createRootIdentities(alice, bob, charlie),
        createCriteria(),
      );

      expect(getIds(result)).toEqual([alice, bob, charlie]);
    });

    it('should never cluster validators without identity', () => {
      const validators = [
        createValidator(alice, { apy: 9 }),
        createValidator(bob, { apy: 8 }),
        createValidator(charlie, { apy: 7 }),
        createValidator(dave, { apy: 6 }),
      ];
      const parents: IdentityParentMap = { [alice]: null, [bob]: null };

      const result = recommendationsService.recommendValidators(
        validators,
        parents,
        createOpenCriteria({ limitClusters: true }),
      );

      expect(getIds(result)).toEqual([alice, bob, charlie, dave]);
    });

    it('should keep every cluster member when limitClusters is off', () => {
      const validators = [
        createValidator(alice, { apy: 9 }),
        createValidator(bob, { apy: 8 }),
        createValidator(charlie, { apy: 7 }),
      ];
      const parents: IdentityParentMap = { [alice]: operator, [bob]: operator, [charlie]: operator };

      const result = recommendationsService.recommendValidators(
        validators,
        parents,
        createCriteria({ limitClusters: false }),
      );

      expect(getIds(result)).toEqual([alice, bob, charlie]);
    });
  });

  describe('limit', () => {
    it('should cut the result to the limit', () => {
      const validators = [
        createValidator(alice, { apy: 9 }),
        createValidator(bob, { apy: 8 }),
        createValidator(charlie, { apy: 7 }),
      ];

      const result = recommendationsService.recommendValidators(validators, {}, createOpenCriteria({ limit: 2 }));

      expect(getIds(result)).toEqual([alice, bob]);
    });

    it('should return nothing for limit 0', () => {
      const validators = [createValidator(alice, { apy: 9 }), createValidator(bob, { apy: 8 })];

      const result = recommendationsService.recommendValidators(validators, {}, createOpenCriteria({ limit: 0 }));

      expect(result).toEqual([]);
    });

    it('should return nothing for an empty input', () => {
      const result = recommendationsService.recommendValidators([], {}, createCriteria());

      expect(result).toEqual([]);
    });

    it('should not mutate the input list', () => {
      const validators = [createValidator(alice, { apy: 1 }), createValidator(bob, { apy: 9 })];

      recommendationsService.recommendValidators(validators, {}, createOpenCriteria());

      expect(getIds(validators)).toEqual([alice, bob]);
    });
  });
});

describe('recommendationsService.getScoreBreakdown', () => {
  describe('commission', () => {
    it('should score the cheapest validator of the set highest', () => {
      const cheap = createValidator(alice, { commission: 0 });
      const middle = createValidator(bob, { commission: 5 });
      const expensive = createValidator(charlie, { commission: 10 });
      const all = [cheap, middle, expensive];

      expect(recommendationsService.getScoreBreakdown(cheap, all).commission).toBe(1);
      expect(recommendationsService.getScoreBreakdown(middle, all).commission).toBe(0.5);
      expect(recommendationsService.getScoreBreakdown(expensive, all).commission).toBe(0);
    });

    it('should score 1 when every commission is zero', () => {
      const validator = createValidator(alice, { commission: 0 });
      const all = [validator, createValidator(bob, { commission: 0 })];

      // A zero commission is the best possible value, not missing data.
      expect(recommendationsService.getScoreBreakdown(validator, all).commission).toBe(1);
    });

    it('should clamp a commission above the reference set', () => {
      const outsider = createValidator(dave, { commission: 100 });
      const all = [createValidator(alice, { commission: 1 }), createValidator(bob, { commission: 2 })];

      expect(recommendationsService.getScoreBreakdown(outsider, all).commission).toBe(0);
    });
  });

  describe('selfStake', () => {
    it('should keep the smallest bond of the set well clear of zero', () => {
      // The shape of a real Polkadot Asset Hub era: one operator self-bonds a
      // hundred times the minimum, everyone else sits on the floor. Normalising
      // linearly against the top put the whole field at 0, reading as "no skin
      // in the game" for a 10k DOT bond.
      const floor = createValidator(alice, { ownStake: '10000' });
      const whale = createValidator(bob, { ownStake: '1100000' });
      const all = [floor, whale];

      const score = recommendationsService.getScoreBreakdown(floor, all).selfStake;

      expect(Math.round(score * 10)).toBe(1);
      expect(recommendationsService.getScoreBreakdown(whale, all).selfStake).toBe(1);
    });

    it('should spread the field by multiples of the smallest bond', () => {
      const all = [
        createValidator(alice, { ownStake: '10000' }),
        createValidator(bob, { ownStake: '20000' }),
        createValidator(charlie, { ownStake: '100000' }),
        createValidator(dave, { ownStake: '1100000' }),
      ];

      const scores = all.map(v => Math.round(recommendationsService.getScoreBreakdown(v, all).selfStake * 10));

      // Each further multiple of the floor buys a comparable step, rather than
      // everything below the top rounding to the same number.
      expect(scores).toEqual([1, 2, 5, 10]);
    });

    it('should order by self stake', () => {
      const all = [
        createValidator(alice, { ownStake: '10' }),
        createValidator(bob, { ownStake: '50' }),
        createValidator(charlie, { ownStake: '100' }),
      ];

      const scores = all.map(v => recommendationsService.getScoreBreakdown(v, all).selfStake);

      expect(scores[0]).toBeLessThan(scores[1]!);
      expect(scores[1]).toBeLessThan(scores[2]!);
    });

    it('should handle planck values beyond Number.MAX_SAFE_INTEGER', () => {
      const half = createValidator(alice, { ownStake: '4503599627370495500000' });
      const full = createValidator(bob, { ownStake: '9007199254740991000000' });
      const all = [half, full];

      // log1p(1) / log1p(2) - the smallest bond of a two-value set.
      expect(recommendationsService.getScoreBreakdown(half, all).selfStake).toBeCloseTo(0.631, 3);
      expect(recommendationsService.getScoreBreakdown(full, all).selfStake).toBe(1);
    });

    it('should score bonds a planck apart the same', () => {
      // Deliberate: the score is rendered in ten buckets, and 1e-10 DOT is not a
      // difference in how much an operator risks.
      const lower = createValidator(alice, { ownStake: '9007199254740992' });
      const higher = createValidator(bob, { ownStake: '9007199254740993' });
      const all = [lower, higher];

      const lowerScore = recommendationsService.getScoreBreakdown(lower, all).selfStake;

      expect(lowerScore).toBe(recommendationsService.getScoreBreakdown(higher, all).selfStake);
    });

    it('should score 0 when nobody has self stake', () => {
      const validator = createValidator(alice, { ownStake: '0' });
      const all = [validator, createValidator(bob, { ownStake: '0' })];

      expect(recommendationsService.getScoreBreakdown(validator, all).selfStake).toBe(0);
    });

    it('should score 0 for a validator with no self stake among validators that have some', () => {
      const empty = createValidator(alice, { ownStake: '0' });
      const all = [empty, createValidator(bob, { ownStake: '100' })];

      expect(recommendationsService.getScoreBreakdown(empty, all).selfStake).toBe(0);
    });

    it('should score every bond 1 when they are all equal', () => {
      // No spread to measure, so nobody is behind anybody - each of them is the
      // best of the set.
      const validator = createValidator(alice, { ownStake: '100' });
      const all = [validator, createValidator(bob, { ownStake: '100' })];

      expect(recommendationsService.getScoreBreakdown(validator, all).selfStake).toBe(1);
    });

    it('should clamp a self stake above the reference set', () => {
      const outsider = createValidator(dave, { ownStake: '1000' });
      const all = [createValidator(alice, { ownStake: '10' })];

      expect(recommendationsService.getScoreBreakdown(outsider, all).selfStake).toBe(1);
    });

    it('should keep a self stake below the reference set within range', () => {
      const outsider = createValidator(dave, { ownStake: '1' });
      const all = [createValidator(alice, { ownStake: '100' }), createValidator(bob, { ownStake: '1000' })];

      const score = recommendationsService.getScoreBreakdown(outsider, all).selfStake;

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });
  });

  describe('eraPoints', () => {
    it('should normalise against the largest era points', () => {
      const validator = createValidator(alice, { eraPoints: 250 });
      const all = [validator, createValidator(bob, { eraPoints: 1000 })];

      expect(recommendationsService.getScoreBreakdown(validator, all).eraPoints).toBe(0.25);
    });

    it('should score 0 when nobody earned era points', () => {
      const validator = createValidator(alice, { eraPoints: 0 });
      const all = [validator, createValidator(bob, { eraPoints: 0 })];

      expect(recommendationsService.getScoreBreakdown(validator, all).eraPoints).toBe(0);
    });
  });

  it('should score everything 0 against an empty set', () => {
    const validator = createValidator(alice, { commission: 5, ownStake: '10', eraPoints: 7 });

    expect(recommendationsService.getScoreBreakdown(validator, [])).toEqual({
      apy: 0,
      commission: 0,
      selfStake: 0,
      eraPoints: 0,
      overall: 0,
    });
  });

  it('should blend the metrics into overall with the documented weights', () => {
    // Best of the set on every metric - the ceiling the weights add up to.
    const best = createValidator(alice, {
      apy: 20,
      commission: 0,
      ownStake: '100',
      eraPoints: 100,
    });
    const worst = createValidator(bob, { apy: 0, commission: 20, ownStake: '0', eraPoints: 0 });

    const bestScore = recommendationsService.getScoreBreakdown(best, [best, worst]);
    const worstScore = recommendationsService.getScoreBreakdown(worst, [best, worst]);

    expect(bestScore.overall).toBeCloseTo(1);
    expect(worstScore.overall).toBeCloseTo(0);
  });

  it('should weight apy at four tenths of overall', () => {
    // Identical on every metric but APY: the gap between a perfect and a zero
    // APY is exactly the APY weight.
    const shared = { commission: 5, ownStake: '100', eraPoints: 50 };
    const high = createValidator(alice, { ...shared, apy: 10 });
    const low = createValidator(bob, { ...shared, apy: 0 });

    const highScore = recommendationsService.getScoreBreakdown(high, [high, low]);
    const lowScore = recommendationsService.getScoreBreakdown(low, [high, low]);

    expect(highScore.overall - lowScore.overall).toBeCloseTo(SCORE_WEIGHTS.apy);
  });

  it('should report an unknown apy as a zero apy score rather than skipping the metric', () => {
    const known = createValidator(alice, { apy: 10 });
    const unknown = createValidator(bob, { apy: null });

    expect(recommendationsService.getScoreBreakdown(unknown, [known, unknown]).apy).toBe(0);
    expect(recommendationsService.getScoreBreakdown(known, [known, unknown]).apy).toBe(1);
  });

  it('should keep every metric within 0..1', () => {
    const validators = [
      createValidator(alice, { commission: 0, ownStake: '900719925474099100', eraPoints: 900 }),
      createValidator(bob, { commission: 100, ownStake: '1', eraPoints: 0 }),
      createValidator(charlie, { commission: 33, ownStake: '450359962737049550', eraPoints: 450 }),
    ];

    for (const validator of validators) {
      const score = recommendationsService.getScoreBreakdown(validator, validators);

      for (const value of Object.values(score)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});
