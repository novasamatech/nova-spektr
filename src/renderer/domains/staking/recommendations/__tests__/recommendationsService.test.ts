import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraValidator } from '../../validators/types';
import { DEFAULT_RECOMMENDATION_CRITERIA, MAX_PER_CLUSTER } from '../constants';
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
    oversubscribed: false,
    slashed: false,
    eraPoints: 0,
    blocksAuthored: null,
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
    excludeOversubscribed: false,
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

    it('should drop oversubscribed validators when excludeOversubscribed is on', () => {
      const validators = [createValidator(alice, { oversubscribed: true }), createValidator(bob)];

      const result = recommendationsService.recommendValidators(
        validators,
        identities,
        createOpenCriteria({ excludeOversubscribed: true }),
      );

      expect(getIds(result)).toEqual([bob]);
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
        createValidator(bob, { oversubscribed: true }),
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
        createValidator(bob, { oversubscribed: true, apy: 9 }),
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
    it('should sort by apy descending', () => {
      const validators = [
        createValidator(alice, { apy: 3 }),
        createValidator(bob, { apy: 12.5 }),
        createValidator(charlie, { apy: 7 }),
      ];

      const result = recommendationsService.recommendValidators(validators, {}, createOpenCriteria());

      expect(getIds(result)).toEqual([bob, charlie, alice]);
    });

    it('should sort validators with unknown apy last', () => {
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
        createCriteria({ excludeSlashed: false, excludeOversubscribed: false }),
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
    it('should normalise against the largest self stake', () => {
      const small = createValidator(alice, { ownStake: '25' });
      const large = createValidator(bob, { ownStake: '100' });
      const all = [small, large];

      expect(recommendationsService.getScoreBreakdown(small, all).selfStake).toBe(0.25);
      expect(recommendationsService.getScoreBreakdown(large, all).selfStake).toBe(1);
    });

    it('should handle planck values beyond Number.MAX_SAFE_INTEGER', () => {
      const half = createValidator(alice, { ownStake: '4503599627370495500000' });
      const full = createValidator(bob, { ownStake: '9007199254740991000000' });
      const all = [half, full];

      expect(recommendationsService.getScoreBreakdown(half, all).selfStake).toBe(0.5);
      expect(recommendationsService.getScoreBreakdown(full, all).selfStake).toBe(1);
    });

    it('should distinguish stakes that collapse to the same Number', () => {
      // Both parse to 9007199254740992 as a double - only BN keeps them apart.
      const lower = createValidator(alice, { ownStake: '9007199254740992' });
      const higher = createValidator(bob, { ownStake: '9007199254740993' });
      const all = [lower, higher];

      expect(Number(lower.ownStake)).toBe(Number(higher.ownStake));
      expect(recommendationsService.getScoreBreakdown(lower, all).selfStake).toBeLessThan(1);
      expect(recommendationsService.getScoreBreakdown(higher, all).selfStake).toBe(1);
    });

    it('should score 0 when nobody has self stake', () => {
      const validator = createValidator(alice, { ownStake: '0' });
      const all = [validator, createValidator(bob, { ownStake: '0' })];

      expect(recommendationsService.getScoreBreakdown(validator, all).selfStake).toBe(0);
    });

    it('should clamp a self stake above the reference set', () => {
      const outsider = createValidator(dave, { ownStake: '1000' });
      const all = [createValidator(alice, { ownStake: '10' })];

      expect(recommendationsService.getScoreBreakdown(outsider, all).selfStake).toBe(1);
    });
  });

  describe('blockProduction', () => {
    it('should normalise against the largest authored block count', () => {
      const idle = createValidator(alice, { blocksAuthored: 0 });
      const busy = createValidator(bob, { blocksAuthored: 8 });
      const middle = createValidator(charlie, { blocksAuthored: 2 });
      const all = [idle, busy, middle];

      expect(recommendationsService.getScoreBreakdown(idle, all).blockProduction).toBe(0);
      expect(recommendationsService.getScoreBreakdown(busy, all).blockProduction).toBe(1);
      expect(recommendationsService.getScoreBreakdown(middle, all).blockProduction).toBe(0.25);
    });

    it('should treat an unknown count as zero while the set knows blocks', () => {
      const unknown = createValidator(alice, { blocksAuthored: null, eraPoints: 100 });
      const known = createValidator(bob, { blocksAuthored: 4, eraPoints: 1 });
      const all = [unknown, known];

      expect(recommendationsService.getScoreBreakdown(unknown, all).blockProduction).toBe(0);
    });

    it('should fall back to era points when the whole set reports no blocks', () => {
      const validator = createValidator(alice, { blocksAuthored: null, eraPoints: 30 });
      const all = [validator, createValidator(bob, { blocksAuthored: null, eraPoints: 60 })];

      const score = recommendationsService.getScoreBreakdown(validator, all);

      expect(score.blockProduction).toBe(0.5);
      expect(score.blockProduction).toBe(score.eraPoints);
    });

    it('should score 0 when nobody authored a block', () => {
      const validator = createValidator(alice, { blocksAuthored: 0 });
      const all = [validator, createValidator(bob, { blocksAuthored: 0 })];

      expect(recommendationsService.getScoreBreakdown(validator, all).blockProduction).toBe(0);
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
    const validator = createValidator(alice, { commission: 5, ownStake: '10', blocksAuthored: 3, eraPoints: 7 });

    expect(recommendationsService.getScoreBreakdown(validator, [])).toEqual({
      commission: 0,
      selfStake: 0,
      blockProduction: 0,
      eraPoints: 0,
    });
  });

  it('should keep every metric within 0..1', () => {
    const validators = [
      createValidator(alice, { commission: 0, ownStake: '900719925474099100', blocksAuthored: 12, eraPoints: 900 }),
      createValidator(bob, { commission: 100, ownStake: '1', blocksAuthored: 0, eraPoints: 0 }),
      createValidator(charlie, { commission: 33, ownStake: '450359962737049550', blocksAuthored: 5, eraPoints: 450 }),
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
