import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AssetHubChains } from '@/domains/staking';
import { stakingPositions } from '@/aggregates/staking-positions';
import {
  kusamaAssetHubChain,
  polkadotAssetHubChain,
  stakingAccountA,
  stakingAccountB,
  validatorOne,
  validatorTwo,
} from '../../fixtures/index';
import {
  type StakingApiHandle,
  type StakingScenario,
  allureMetadata,
  createStakingApi,
  createStakingScenario,
  nextStakingEra,
} from '../../utils/index';

/**
 * Integration tests for the staking positions aggregate.
 *
 * The whole chain of real modules runs: pooled `shared/query` resources, the
 * staking domain services, `positionsService` derivation and the aggregate's
 * own summary. Only the node is replaced, by an Asset Hub mock api built from
 * real polkadot.js codecs.
 *
 * @group integration
 * @group staking
 * @group staking-positions
 */

const POLKADOT_AH = AssetHubChains.POLKADOT_AH;
const KUSAMA_AH = AssetHubChains.KUSAMA_AH;

const ERA_START_MS = 1_700_000_000_000;
/** SessionsPerEra × epochDuration × expectedBlockTime, per the mock consts. */
const ERA_DURATION_MS = 6 * 2400 * 6000;

describe('Staking Positions - Integration', () => {
  let scenario: StakingScenario | null = null;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'Staking Positions',
      story: 'Position derivation',
      severity: 'critical',
    });
  });

  // The resource pools are module-level and ref-counted, so a key left started
  // outlives the scope it was started in and poisons the next test.
  afterEach(async () => {
    if (scenario) {
      await scenario.env.executeEventVoid(stakingPositions.reset);
      await scenario.env.cleanup();
      scenario = null;
    }
  });

  const startScenario = async (params: Parameters<typeof createStakingScenario>[0]) => {
    scenario = await createStakingScenario(params);

    return scenario;
  };

  const createPolkadotApi = (era: number): StakingApiHandle =>
    createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: era, startMs: ERA_START_MS },
      minNominatorBond: '250000000000',
      ledgers: {
        // Nominating and exposed — the earning case.
        [stakingAccountA.accountId]: { total: '1300', active: '1000', unlocking: [] },
        // A ledger with no nomination at all.
        [stakingAccountB.accountId]: { total: '2000', active: '2000' },
      },
      nominations: {
        [stakingAccountA.accountId]: { targets: [validatorOne, validatorTwo], submittedIn: era - 10 },
        [stakingAccountB.accountId]: null,
      },
      exposures: {
        [era]: {
          [validatorOne]: {
            total: '1000',
            own: '500',
            others: [{ who: stakingAccountA.accountId, value: '1000' }],
          },
          // Elected, but this stash is not in its exposure.
          [validatorTwo]: { total: '900', own: '900', others: [] },
        },
      },
      prefs: {
        [validatorOne]: { commission: 100_000_000 },
        [validatorTwo]: { commission: 50_000_000 },
      },
    });

  it('should derive an active position for an exposed stash and a bonded one for a stash without nominations', async () => {
    const polkadot = createPolkadotApi(nextStakingEra());
    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api },
    });

    await settle();

    const positions = env.getState(stakingPositions.$positions);
    expect(positions).toHaveLength(2);

    expect(positions.find((position) => position.accountId === stakingAccountA.accountId)).toMatchObject({
      chainId: POLKADOT_AH,
      status: 'active',
      statusReason: null,
      nominations: [validatorOne, validatorTwo],
      activeValidators: [validatorOne],
    });

    expect(positions.find((position) => position.accountId === stakingAccountB.accountId)).toMatchObject({
      chainId: POLKADOT_AH,
      status: 'bonded',
      statusReason: null,
      nominations: [],
      activeValidators: [],
    });

    // The min bond subscription rides the same pool and lands with the rest.
    expect(env.getState(stakingPositions.$minNominatorBond)).toEqual({ [POLKADOT_AH]: '250000000000' });
    expect(env.getState(stakingPositions.$pending)).toBe(false);
  });

  it('should report `waiting` while the election has not applied a fresh nomination', async () => {
    const era = nextStakingEra();
    const polkadot = createPolkadotApi(era);
    // Submitted in the active era — an absent exposure is expected here, so the
    // position must not be reported as inactive.
    polkadot.state.nominations[stakingAccountA.accountId] = { targets: [validatorTwo], submittedIn: era };

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api },
    });

    await settle();

    const position = env
      .getState(stakingPositions.$positions)
      .find((item) => item.accountId === stakingAccountA.accountId);

    expect(position?.status).toBe('waiting');
    expect(position?.statusReason).toBeNull();
  });

  it('should report `inactive` with a reason when the elected targets do not expose the stash', async () => {
    const era = nextStakingEra();
    const polkadot = createPolkadotApi(era);
    polkadot.state.nominations[stakingAccountA.accountId] = { targets: [validatorTwo], submittedIn: era - 10 };

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api },
    });

    await settle();

    const position = env
      .getState(stakingPositions.$positions)
      .find((item) => item.accountId === stakingAccountA.accountId);

    expect(position?.status).toBe('inactive');
    // `validatorTwo` is elected for the era but holds no page with this stash.
    expect(position?.statusReason).toBe('notExposed');
    expect(position?.activeValidators).toEqual([]);
  });

  it('should split unlocking chunks into redeemable and unbonding at the era boundary', async () => {
    const era = nextStakingEra();
    const polkadot = createPolkadotApi(era);
    polkadot.state.ledgers[stakingAccountA.accountId] = {
      total: '1600',
      active: '1000',
      unlocking: [
        // Already unlocked — era <= activeEra.
        { value: '100', era: era - 1 },
        // Unlocks exactly at the active era, so it is redeemable too.
        { value: '200', era },
        { value: '300', era: era + 3 },
      ],
    };

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api },
    });

    await settle();

    const position = env
      .getState(stakingPositions.$positions)
      .find((item) => item.accountId === stakingAccountA.accountId);

    expect(position?.redeemable).toBe('300');
    expect(position?.totalUnbonding).toBe('300');
    expect(position?.unbonding).toEqual([
      {
        value: '300',
        era: era + 3,
        erasLeft: 3,
        unlockEstimateMs: ERA_START_MS + 3 * ERA_DURATION_MS,
        redeemable: false,
      },
    ]);
  });

  it('should keep per-chain planck totals separate and count active validators per chain', async () => {
    const era = nextStakingEra();
    const polkadot = createPolkadotApi(era);
    polkadot.state.ledgers[stakingAccountA.accountId] = {
      total: '1300',
      active: '1000',
      unlocking: [
        { value: '100', era: era - 1 },
        { value: '200', era: era + 2 },
      ],
    };

    // The very same validator key backs a position on Kusama Asset Hub. Planck
    // amounts of different assets must never be summed, and the validator has
    // to count once per chain.
    const kusama = createStakingApi({
      chainId: KUSAMA_AH,
      activeEra: { index: era, startMs: ERA_START_MS },
      ledgers: {
        [stakingAccountA.accountId]: { total: '500', active: '500' },
        [stakingAccountB.accountId]: null,
      },
      nominations: {
        [stakingAccountA.accountId]: { targets: [validatorOne], submittedIn: era - 10 },
        [stakingAccountB.accountId]: null,
      },
      exposures: {
        [era]: {
          [validatorOne]: { total: '500', own: '0', others: [{ who: stakingAccountA.accountId, value: '500' }] },
        },
      },
      prefs: { [validatorOne]: { commission: 100_000_000 } },
    });

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain, kusamaAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api, [KUSAMA_AH]: kusama.api },
    });

    await settle();

    const summary = env.getState(stakingPositions.$summary);

    expect(summary.positionCount).toBe(3);
    expect(summary.earningPositionCount).toBe(2);
    // One distinct validator per chain — the same key counted twice on purpose.
    expect(summary.activeValidatorCount).toBe(2);

    expect(summary.byChain[POLKADOT_AH]).toMatchObject({
      // 1300 nominating + 2000 merely bonded.
      totalStaked: '3300',
      redeemable: '100',
      totalUnbonding: '200',
      activeValidatorCount: 1,
      positionCount: 2,
      earningPositionCount: 1,
    });

    expect(summary.byChain[KUSAMA_AH]).toMatchObject({
      totalStaked: '500',
      redeemable: '0',
      totalUnbonding: '0',
      activeValidatorCount: 1,
      positionCount: 1,
      earningPositionCount: 1,
    });

    // Planck totals live per chain only — nothing is summed across assets.
    expect(summary).not.toHaveProperty('totalStaked');
    expect(summary.chains.map((chain) => chain.chainId)).toEqual([POLKADOT_AH, KUSAMA_AH]);
  });

  it('should resolve pending and hold no positions for a wallet that stakes nowhere', async () => {
    const polkadot = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: nextStakingEra(), startMs: ERA_START_MS },
      ledgers: {
        [stakingAccountA.accountId]: null,
        [stakingAccountB.accountId]: null,
      },
    });

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api },
    });

    await settle();

    expect(env.getState(stakingPositions.$positions)).toEqual([]);
    // An empty ledger map is an answer, not an unfinished load.
    expect(env.getState(stakingPositions.$pending)).toBe(false);
  });

  it('should follow a live ledger update without restarting the chain subscriptions', async () => {
    const polkadot = createPolkadotApi(nextStakingEra());
    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: polkadot.api },
    });

    await settle();

    const before = polkadot.subscribeCalls();
    expect(env.getState(stakingPositions.$summary).byChain[POLKADOT_AH]?.totalStaked).toBe('3300');

    polkadot.setLedger(stakingAccountB.accountId, { total: '5000', active: '5000' });
    await settle();

    expect(env.getState(stakingPositions.$summary).byChain[POLKADOT_AH]?.totalStaked).toBe('6300');
    expect(polkadot.subscribeCalls()).toEqual(before);
  });
});
