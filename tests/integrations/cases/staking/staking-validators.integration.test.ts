import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountId } from '@/shared/mocks';
import { identityPallet } from '@/shared/pallet/identity';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { identity } from '@/domains/network';
import { AssetHubChains, DEFAULT_RECOMMENDATION_CRITERIA, validators } from '@/domains/staking';
import { stakingValidators } from '@/aggregates/staking-validators';
import { $persistedCriteria, STAKING_RECOMMENDATION_CRITERIA } from '@/aggregates/staking-validators/model';
import { polkadotAssetHubChain } from '../../fixtures/index';
import {
  type StakingApiHandle,
  type StakingScenario,
  allureMetadata,
  createStakingApi,
  createStakingScenario,
  nextStakingEra,
} from '../../utils/index';

/**
 * Integration tests for the staking validators aggregate: persisted
 * recommendation criteria and the recommendation itself, built from a real
 * `validatorsResource` fetch and a real identity resolution.
 *
 * @group integration
 * @group staking
 * @group staking-validators
 */

const POLKADOT_AH = AssetHubChains.POLKADOT_AH;
const ERA_START_MS = 1_700_000_000_000;

const { validatorsResource } = validators;

/**
 * Five validators of one era, ordered by commission. APY is derived from
 * commission and exposure, so a lower commission is a better recommendation -
 * that makes the expected ranking `one, two, three, four, five`.
 */
type ValidatorSet = {
  accountIds: AccountId[];
  handle: StakingApiHandle;
  era: number;
};

let setSeed = 0;

function createValidatorSet(options: { maxNominations?: number } = {}): ValidatorSet {
  setSeed += 1;
  const era = nextStakingEra();

  // Fresh account ids per set: the resource caches memoise per key, so reusing
  // ids across tests would answer from another scope's request.
  const accountIds = Array.from({ length: 5 }, (_, index) => createAccountId(`validator-set-${setSeed}-${index}`));

  const exposures: Record<AccountId, { total: string; own: string; others: [] }> = {};
  const prefs: Record<AccountId, { commission: number }> = {};

  for (const [index, accountId] of accountIds.entries()) {
    exposures[accountId] = { total: '1000000000000', own: '100000000000', others: [] };
    // 1%, 2%, 3%, 4%, 5% — strictly increasing, so APY strictly decreasing.
    prefs[accountId] = { commission: (index + 1) * 10_000_000 };
  }

  const handle = createStakingApi({
    chainId: POLKADOT_AH,
    activeEra: { index: era, startMs: ERA_START_MS },
    exposures: { [era]: exposures },
    prefs,
    erasTotalStake: { [era]: '5000000000000' },
    erasValidatorReward: { [era - 1]: '1000000000' },
    withIdentityPallet: true,
    consts: options.maxNominations ? { maxNominations: options.maxNominations } : undefined,
  });

  return { accountIds, handle, era };
}

/**
 * Resolves the given display names on chain. Every validator is a root identity
 * here — `buildIdentityParents` clusters by display name, so sub-identities add
 * nothing the test does not already cover.
 */
function stubIdentities(names: Record<AccountId, string>) {
  vi.spyOn(identityPallet.storage, 'superOf').mockImplementation(((_api: unknown, accounts: AccountId[]) =>
    Promise.resolve(accounts.map((account) => ({ account, identity: null })))) as never);

  vi.spyOn(identityPallet.storage, 'identityOf').mockImplementation(((_api: unknown, accounts: AccountId[]) =>
    Promise.resolve(
      accounts.map((account) => {
        const display = names[account];

        return {
          account,
          identity: display
            ? { info: { display, email: '', image: '', web: '', github: undefined, matrix: undefined } }
            : null,
        };
      }),
    )) as never);
}

describe('Staking Validators - Integration', () => {
  let scenario: StakingScenario | null = null;

  beforeEach(async () => {
    localStorage.clear();
    await allureMetadata({
      epic: 'Staking',
      feature: 'Staking Validators',
      story: 'Recommendation criteria',
      severity: 'critical',
    });
  });

  afterEach(async () => {
    if (scenario) {
      await scenario.env.cleanup();
      scenario = null;
    }
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const startScenario = async (params: Parameters<typeof createStakingScenario>[0] = {}) => {
    scenario = await createStakingScenario(params);

    return scenario;
  };

  /**
   * Loads the elected set through the real resource and resolves identities
   * through the real identity resource.
   */
  const loadValidators = async (
    { accountIds, handle, era }: ValidatorSet,
    names: Record<AccountId, string> = {},
  ): Promise<StakingScenario> => {
    stubIdentities(names);

    const started = await startScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: handle.api },
    });

    await allSettled(validatorsResource.start, {
      scope: started.env.scope,
      params: { chainId: POLKADOT_AH, api: handle.api, era, timelineApi: handle.api },
    });
    await allSettled(identity.request, {
      scope: started.env.scope,
      params: { chainId: POLKADOT_AH, accounts: accountIds },
    });
    await started.settle();

    return started;
  };

  describe('criteria persistence', () => {
    it('should start from the strict defaults when nothing was ever stored', async () => {
      const { env } = await startScenario();

      expect(env.getState(stakingValidators.$criteria)).toEqual(DEFAULT_RECOMMENDATION_CRITERIA);
    });

    it('should merge a partial patch and write it through to local storage', async () => {
      const { env } = await startScenario();

      await env.executeEvent(stakingValidators.setCriteria, { requireIdentity: false });

      expect(env.getState(stakingValidators.$criteria)).toEqual({
        ...DEFAULT_RECOMMENDATION_CRITERIA,
        requireIdentity: false,
      });
      expect(JSON.parse(localStorage.getItem(STAKING_RECOMMENDATION_CRITERIA) ?? 'null')).toEqual({
        ...DEFAULT_RECOMMENDATION_CRITERIA,
        requireIdentity: false,
      });
    });

    it('should restore the defaults on reset', async () => {
      const { env } = await startScenario();

      await env.executeEvent(stakingValidators.setCriteria, { requireIdentity: false, limitClusters: false });
      await env.executeEventVoid(stakingValidators.resetCriteria);

      expect(env.getState(stakingValidators.$criteria)).toEqual(DEFAULT_RECOMMENDATION_CRITERIA);
    });

    it('should fall back to the defaults for every corrupt key of a persisted payload', async () => {
      // Exactly the shape `persist` hydrates the store with — localStorage can
      // hold an older shape, a half-written value or a hand-edited entry.
      const { env } = await startScenario();
      await allSettled($persistedCriteria, {
        scope: env.scope,
        params: { excludeSlashed: 'yes', limitClusters: null, requireIdentity: false },
      });

      expect(env.getState(stakingValidators.$criteria)).toEqual({
        ...DEFAULT_RECOMMENDATION_CRITERIA,
        requireIdentity: false,
      });
    });

    it('should fall back to the defaults when the persisted payload is not an object at all', async () => {
      const { env } = await startScenario();

      for (const payload of ['nonsense', 42, null, ['excludeSlashed']]) {
        await allSettled($persistedCriteria, { scope: env.scope, params: payload });

        expect(env.getState(stakingValidators.$criteria)).toEqual(DEFAULT_RECOMMENDATION_CRITERIA);
      }
    });
  });

  describe('recommendation', () => {
    it('should report pending until the elected set of the selected chain lands', async () => {
      const { env } = await startScenario({ chains: [polkadotAssetHubChain] });

      expect(env.getState(stakingValidators.$pending)).toBe(true);
      expect(env.getState(stakingValidators.$recommended)).toEqual([]);
    });

    it('should keep at most two validators of one identity cluster', async () => {
      const set = createValidatorSet();
      const [one, two, three, four, five] = set.accountIds as [AccountId, AccountId, AccountId, AccountId, AccountId];

      // One operator runs three validators; the last two have no identity.
      const { env } = await loadValidators(set, {
        [one]: 'Operator A',
        [two]: 'Operator A',
        [three]: 'Operator A',
      });

      expect(env.getState(stakingValidators.$pending)).toBe(false);
      await env.executeEvent(stakingValidators.setCriteria, { requireIdentity: false });

      // `three` is the third-best of its cluster and is the one dropped.
      expect(env.getState(stakingValidators.$recommended)).toEqual([one, two, four, five]);

      // The cluster is keyed by the display name, with the lowest account id of
      // the group as its stable representative.
      const representative = [one, two, three].toSorted()[0];
      expect(env.getState(stakingValidators.$identityParents)).toEqual({
        [one]: representative,
        [two]: representative,
        [three]: representative,
      });
    });

    it('should bring the whole cluster back when the cluster limit is switched off', async () => {
      const set = createValidatorSet();
      const [one, two, three, four, five] = set.accountIds as [AccountId, AccountId, AccountId, AccountId, AccountId];

      const { env } = await loadValidators(set, {
        [one]: 'Operator A',
        [two]: 'Operator A',
        [three]: 'Operator A',
      });

      await env.executeEvent(stakingValidators.setCriteria, { requireIdentity: false });
      expect(env.getState(stakingValidators.$recommended)).toHaveLength(4);

      await env.executeEvent(stakingValidators.setCriteria, { limitClusters: false });

      expect(env.getState(stakingValidators.$recommended)).toEqual([one, two, three, four, five]);
    });

    it('should drop the identity-less validators as soon as an identity is required', async () => {
      const set = createValidatorSet();
      const [one, two, three] = set.accountIds as [AccountId, AccountId, AccountId];

      const { env } = await loadValidators(set, {
        [one]: 'Operator A',
        [two]: 'Operator A',
        [three]: 'Operator A',
      });

      await env.executeEvent(stakingValidators.setCriteria, { requireIdentity: false });
      expect(env.getState(stakingValidators.$recommended)).toHaveLength(4);

      await env.executeEvent(stakingValidators.setCriteria, { requireIdentity: true });

      expect(env.getState(stakingValidators.$recommended)).toEqual([one, two]);
    });

    it('should never fill more nomination slots than the chain allows', async () => {
      const set = createValidatorSet({ maxNominations: 3 });
      const [one, two, three, four, five] = set.accountIds as [AccountId, AccountId, AccountId, AccountId, AccountId];

      const { env } = await loadValidators(set, {
        [one]: 'Operator A',
        [two]: 'Operator B',
        [three]: 'Operator C',
        [four]: 'Operator D',
        [five]: 'Operator E',
      });

      expect(env.getState(stakingValidators.$maxNominations)).toBe(3);
      expect(env.getState(stakingValidators.$recommendedCount)).toBe(3);
      expect(env.getState(stakingValidators.$recommended)).toEqual([one, two, three]);
    });
  });
});
