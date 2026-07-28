import { type ChainId, type Stake, type Unlocking } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraAnchor } from '../../era/service';
import { type Exposure } from '../../exposures/types';
import { type Nomination } from '../../nominations/types';
import { type EraValidator, type EraValidatorMap } from '../../validators/types';
import { positionsService } from '../service';
import { type DerivePositionInput } from '../types';

const chainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;

const stash = '0x01' as AccountId;
const otherStash = '0x02' as AccountId;
const controller = '0x03' as AccountId;

const validatorA = '0xa1' as AccountId;
const validatorB = '0xa2' as AccountId;
const validatorC = '0xa3' as AccountId;

const ACTIVE_ERA = 100;

const anchor: EraAnchor = { eraStartMs: 1_700_000_000_000, eraDurationMs: 6 * 60 * 60 * 1000 };

function createStake(overrides: Partial<Stake> = {}): Stake {
  return {
    accountId: stash,
    chainId,
    controller,
    stash,
    active: '1000',
    total: '1000',
    unlocking: [],
    ...overrides,
  };
}

function createUnlocking(entries: [value: string, era: number][]): Unlocking[] {
  return entries.map(([value, era]) => ({ value, era: era.toString() }));
}

function createExposure(others: AccountId[]): Exposure {
  return {
    total: '1000',
    own: '100',
    nominatorCount: others.length,
    pageCount: 1,
    others: others.map(who => ({ who, value: '10' })),
  };
}

function createValidator(accountId: AccountId): EraValidator {
  return {
    accountId,
    totalStake: '1000',
    ownStake: '100',
    commission: 5,
    blocked: false,
    nominatorCount: 10,
    pageCount: 1,
    maxNominatorsRewarded: 512,
    slashed: false,
    eraPoints: 100,
    blocksAuthored: null,
    apy: 15,
    elected: true,
  };
}

function createValidatorMap(validators: EraValidator[]): EraValidatorMap {
  return validators.reduce<EraValidatorMap>((acc, validator) => {
    acc[validator.accountId] = validator;

    return acc;
  }, {});
}

function createNomination(targets: AccountId[], submittedIn = ACTIVE_ERA - 5): Nomination {
  return { targets, submittedIn };
}

function createInput(overrides: Partial<DerivePositionInput> = {}): DerivePositionInput {
  return {
    accountId: stash,
    chainId,
    stake: createStake(),
    nomination: null,
    exposures: {},
    validators: null,
    activeEra: ACTIVE_ERA,
    eraAnchor: null,
    ...overrides,
  };
}

describe('positionsService', () => {
  describe('status', () => {
    test('should be bonded when there is no nomination', () => {
      const position = positionsService.derivePosition(createInput());

      expect(position.status).toEqual('bonded');
      expect(position.statusReason).toBeNull();
      expect(position.nominations).toEqual([]);
      expect(position.activeValidators).toEqual([]);
    });

    test('should be bonded when the nomination has no targets', () => {
      const position = positionsService.derivePosition(createInput({ nomination: createNomination([]) }));

      expect(position.status).toEqual('bonded');
      expect(position.statusReason).toBeNull();
    });

    test('should be waiting when the nomination was submitted in the active era', () => {
      const position = positionsService.derivePosition(
        createInput({ nomination: createNomination([validatorA], ACTIVE_ERA) }),
      );

      expect(position.status).toEqual('waiting');
      expect(position.statusReason).toBeNull();
    });

    test('should be waiting when the nomination was submitted after the active era', () => {
      const position = positionsService.derivePosition(
        createInput({ nomination: createNomination([validatorA], ACTIVE_ERA + 1) }),
      );

      expect(position.status).toEqual('waiting');
    });

    test('should prefer waiting over the exposure check', () => {
      const position = positionsService.derivePosition(
        createInput({
          nomination: createNomination([validatorA], ACTIVE_ERA),
          exposures: { [validatorA]: createExposure([stash]) },
          validators: createValidatorMap([createValidator(validatorA)]),
        }),
      );

      expect(position.status).toEqual('waiting');
      expect(position.activeValidators).toEqual([validatorA]);
    });

    test('should be active when the stash is exposed by a nominated validator', () => {
      const position = positionsService.derivePosition(
        createInput({
          nomination: createNomination([validatorA, validatorB]),
          exposures: {
            [validatorA]: createExposure([otherStash]),
            [validatorB]: createExposure([otherStash, stash]),
          },
          validators: createValidatorMap([createValidator(validatorA), createValidator(validatorB)]),
        }),
      );

      expect(position.status).toEqual('active');
      expect(position.statusReason).toBeNull();
      expect(position.activeValidators).toEqual([validatorB]);
      expect(position.nominations).toEqual([validatorA, validatorB]);
    });

    test('should list every exposing validator in nomination order', () => {
      const position = positionsService.derivePosition(
        createInput({
          nomination: createNomination([validatorC, validatorA, validatorB]),
          exposures: {
            [validatorA]: createExposure([stash]),
            [validatorB]: createExposure([otherStash]),
            [validatorC]: createExposure([stash, otherStash]),
          },
        }),
      );

      expect(position.activeValidators).toEqual([validatorC, validatorA]);
    });

    test('should match the exposure against the stash, not the queried account', () => {
      const position = positionsService.derivePosition(
        createInput({
          accountId: controller,
          stake: createStake({ accountId: controller, stash }),
          nomination: createNomination([validatorA]),
          exposures: { [validatorA]: createExposure([stash]) },
        }),
      );

      expect(position.accountId).toEqual(controller);
      expect(position.status).toEqual('active');
      expect(position.activeValidators).toEqual([validatorA]);
    });

    test('should be inactive when the nominated validators do not expose the stash', () => {
      const position = positionsService.derivePosition(
        createInput({
          nomination: createNomination([validatorA]),
          exposures: { [validatorA]: createExposure([otherStash]) },
          validators: createValidatorMap([createValidator(validatorA)]),
        }),
      );

      expect(position.status).toEqual('inactive');
      expect(position.activeValidators).toEqual([]);
    });

    test('should be inactive when the nominated validator is missing from the exposures', () => {
      const position = positionsService.derivePosition(
        createInput({
          nomination: createNomination([validatorA]),
          exposures: {},
          validators: createValidatorMap([createValidator(validatorA)]),
        }),
      );

      expect(position.status).toEqual('inactive');
      expect(position.activeValidators).toEqual([]);
      expect(position.statusReason).toEqual('notExposed');
    });
  });

  describe('statusReason', () => {
    test('should be notElected when none of the nominated validators is elected', () => {
      const position = positionsService.derivePosition(
        createInput({
          nomination: createNomination([validatorA, validatorB]),
          exposures: {},
          validators: createValidatorMap([createValidator(validatorC)]),
        }),
      );

      expect(position.status).toEqual('inactive');
      expect(position.statusReason).toEqual('notElected');
    });

    test('should be notExposed when an elected validator does not expose the stash', () => {
      const position = positionsService.derivePosition(
        createInput({
          nomination: createNomination([validatorA, validatorB]),
          exposures: { [validatorA]: createExposure([otherStash]) },
          validators: createValidatorMap([createValidator(validatorA), createValidator(validatorB)]),
        }),
      );

      expect(position.status).toEqual('inactive');
      expect(position.statusReason).toEqual('notExposed');
    });

    test('should stay null when the era validator set is unavailable', () => {
      const position = positionsService.derivePosition(
        createInput({
          nomination: createNomination([validatorA]),
          exposures: { [validatorA]: createExposure([otherStash]) },
          validators: null,
        }),
      );

      expect(position.status).toEqual('inactive');
      expect(position.statusReason).toBeNull();
    });

    test('should stay null for non-inactive statuses', () => {
      const validators = createValidatorMap([createValidator(validatorA)]);

      const active = positionsService.derivePosition(
        createInput({
          nomination: createNomination([validatorA]),
          exposures: { [validatorA]: createExposure([stash]) },
          validators,
        }),
      );
      const waiting = positionsService.derivePosition(
        createInput({ nomination: createNomination([validatorA], ACTIVE_ERA), validators }),
      );
      const bonded = positionsService.derivePosition(createInput({ validators }));

      expect(active.statusReason).toBeNull();
      expect(waiting.statusReason).toBeNull();
      expect(bonded.statusReason).toBeNull();
    });
  });

  describe('deriveRedeemable', () => {
    test('should return zero for an empty unlocking list', () => {
      expect(positionsService.deriveRedeemable([], ACTIVE_ERA)).toEqual('0');
    });

    test('should count the chunk unlocking exactly at the active era', () => {
      const unlocking = createUnlocking([['500', ACTIVE_ERA]]);

      expect(positionsService.deriveRedeemable(unlocking, ACTIVE_ERA)).toEqual('500');
    });

    test('should skip chunks unlocking after the active era', () => {
      const unlocking = createUnlocking([
        ['500', ACTIVE_ERA],
        ['700', ACTIVE_ERA + 1],
      ]);

      expect(positionsService.deriveRedeemable(unlocking, ACTIVE_ERA)).toEqual('500');
    });

    test('should sum planck values beyond the safe integer range', () => {
      const unlocking = createUnlocking([
        ['12345678901234567890', ACTIVE_ERA - 2],
        ['98765432109876543210', ACTIVE_ERA],
        ['55555555555555555555', ACTIVE_ERA + 1],
      ]);

      expect(positionsService.deriveRedeemable(unlocking, ACTIVE_ERA)).toEqual('111111111011111111100');
    });
  });

  describe('deriveUnbondingChunks', () => {
    test('should return an empty list for an empty unlocking list', () => {
      expect(positionsService.deriveUnbondingChunks([], ACTIVE_ERA, anchor)).toEqual([]);
    });

    test('should mark the chunk at the active era as redeemable', () => {
      const [chunk] = positionsService.deriveUnbondingChunks(createUnlocking([['500', ACTIVE_ERA]]), ACTIVE_ERA, null);

      expect(chunk).toEqual({
        value: '500',
        era: ACTIVE_ERA,
        erasLeft: 0,
        unlockEstimateMs: null,
        redeemable: true,
      });
    });

    test('should keep erasLeft at zero for chunks unlocked in a past era', () => {
      const [chunk] = positionsService.deriveUnbondingChunks(
        createUnlocking([['500', ACTIVE_ERA - 4]]),
        ACTIVE_ERA,
        null,
      );

      expect(chunk?.erasLeft).toEqual(0);
      expect(chunk?.redeemable).toBe(true);
    });

    test('should count one era left for the chunk right after the active era', () => {
      const [chunk] = positionsService.deriveUnbondingChunks(
        createUnlocking([['500', ACTIVE_ERA + 1]]),
        ACTIVE_ERA,
        null,
      );

      expect(chunk?.erasLeft).toEqual(1);
      expect(chunk?.redeemable).toBe(false);
    });

    test('should order chunks soonest first', () => {
      const unlocking = createUnlocking([
        ['300', ACTIVE_ERA + 7],
        ['100', ACTIVE_ERA - 1],
        ['200', ACTIVE_ERA + 2],
      ]);

      const chunks = positionsService.deriveUnbondingChunks(unlocking, ACTIVE_ERA, null);

      expect(chunks.map(chunk => chunk.era)).toEqual([ACTIVE_ERA - 1, ACTIVE_ERA + 2, ACTIVE_ERA + 7]);
      expect(chunks.map(chunk => chunk.erasLeft)).toEqual([0, 2, 7]);
    });

    test('should leave the unlock estimate empty without an era anchor', () => {
      const chunks = positionsService.deriveUnbondingChunks(
        createUnlocking([['500', ACTIVE_ERA + 3]]),
        ACTIVE_ERA,
        null,
      );

      expect(chunks[0]?.unlockEstimateMs).toBeNull();
    });

    test('should derive the unlock estimate from the era anchor', () => {
      const unlocking = createUnlocking([
        ['500', ACTIVE_ERA + 3],
        ['100', ACTIVE_ERA],
      ]);

      const chunks = positionsService.deriveUnbondingChunks(unlocking, ACTIVE_ERA, anchor);

      expect(chunks[0]?.unlockEstimateMs).toEqual(anchor.eraStartMs);
      expect(chunks[1]?.unlockEstimateMs).toEqual(anchor.eraStartMs + 3 * anchor.eraDurationMs);
    });
  });

  describe('unbonding totals', () => {
    test('should be empty when nothing is unlocking', () => {
      const position = positionsService.derivePosition(createInput());

      expect(position.unbonding).toEqual([]);
      expect(position.redeemable).toEqual('0');
      expect(position.totalUnbonding).toEqual('0');
    });

    test('should split the chunks at the active era boundary', () => {
      const position = positionsService.derivePosition(
        createInput({
          stake: createStake({
            unlocking: createUnlocking([
              ['400', ACTIVE_ERA + 2],
              ['100', ACTIVE_ERA - 3],
              ['250', ACTIVE_ERA],
              ['300', ACTIVE_ERA + 1],
            ]),
          }),
          eraAnchor: anchor,
        }),
      );

      expect(position.redeemable).toEqual('350');
      expect(position.totalUnbonding).toEqual('700');
      expect(position.unbonding).toEqual([
        {
          value: '300',
          era: ACTIVE_ERA + 1,
          erasLeft: 1,
          unlockEstimateMs: anchor.eraStartMs + anchor.eraDurationMs,
          redeemable: false,
        },
        {
          value: '400',
          era: ACTIVE_ERA + 2,
          erasLeft: 2,
          unlockEstimateMs: anchor.eraStartMs + 2 * anchor.eraDurationMs,
          redeemable: false,
        },
      ]);
    });

    test('should sum planck values beyond the safe integer range', () => {
      const position = positionsService.derivePosition(
        createInput({
          stake: createStake({
            unlocking: createUnlocking([
              ['12345678901234567890', ACTIVE_ERA + 1],
              ['98765432109876543210', ACTIVE_ERA + 2],
              ['55555555555555555555', ACTIVE_ERA - 1],
            ]),
          }),
        }),
      );

      expect(position.totalUnbonding).toEqual('111111111011111111100');
      expect(position.redeemable).toEqual('55555555555555555555');
    });
  });

  describe('derivePositions', () => {
    test('should derive every input, preserving order', () => {
      const bondedInput = createInput({ accountId: stash, stake: createStake() });
      const activeInput = createInput({
        accountId: otherStash,
        stake: createStake({ accountId: otherStash, stash: otherStash, unlocking: createUnlocking([['10', 99]]) }),
        nomination: createNomination([validatorA]),
        exposures: { [validatorA]: createExposure([otherStash]) },
        validators: createValidatorMap([createValidator(validatorA)]),
      });
      const inactiveInput = createInput({
        nomination: createNomination([validatorB]),
        exposures: {},
        validators: createValidatorMap([createValidator(validatorB)]),
      });

      const positions = positionsService.derivePositions([bondedInput, activeInput, inactiveInput]);

      expect(positions).toHaveLength(3);
      expect(positions.map(position => position.status)).toEqual(['bonded', 'active', 'inactive']);
      expect(positions.map(position => position.statusReason)).toEqual([null, null, 'notExposed']);
      expect(positions[1]?.accountId).toEqual(otherStash);
      expect(positions[1]?.redeemable).toEqual('10');
      expect(positions[2]?.chainId).toEqual(chainId);
    });

    test('should return an empty list for no inputs', () => {
      expect(positionsService.derivePositions([])).toEqual([]);
    });
  });

  test('should keep the ledger data untouched', () => {
    const stake = createStake({ unlocking: createUnlocking([['500', ACTIVE_ERA + 1]]) });
    const position = positionsService.derivePosition(createInput({ stake }));

    expect(position.stake).toBe(stake);
    expect(stake.unlocking).toEqual([{ value: '500', era: (ACTIVE_ERA + 1).toString() }]);
  });
});
