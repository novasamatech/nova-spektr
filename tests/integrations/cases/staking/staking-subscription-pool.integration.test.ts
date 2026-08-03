import { allSettled, createWatch } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type ResourceRequestKey } from '@/shared/query';
import { AssetHubChains, exposures, nominations, staking, validators } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { stakingPositions } from '@/aggregates/staking-positions';
import { polkadotAssetHubChain, stakingAccountA, stakingAccountB, validatorOne } from '../../fixtures/index';
import {
  type StakingScenario,
  allureMetadata,
  createStakingApi,
  createStakingScenario,
  nextStakingEra,
} from '../../utils/index';

/**
 * The `shared/query` resources are ref-counted pools: two consumers asking for
 * the same key share one upstream subscription, and only the last `stop`
 * actually tears it down. Getting that wrong either duplicates chain traffic or
 * leaks a subscription per era.
 *
 * @group integration
 * @group staking
 * @group staking-subscription-pool
 */

const POLKADOT_AH = AssetHubChains.POLKADOT_AH;
const ERA_START_MS = 1_700_000_000_000;

const { stakingResource } = staking;
const { nominationsResource } = nominations;
const { exposuresResource, exposurePagesResource } = exposures;
const { validatorsResource } = validators;

describe('Staking Subscription Pool - Integration', () => {
  let scenario: StakingScenario | null = null;

  beforeEach(async () => {
    await allureMetadata({
      epic: 'Staking',
      feature: 'Staking Positions',
      story: 'Subscription pooling',
      severity: 'critical',
    });
  });

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

  it('should open one chain subscription for two consumers of the same key and close it only on the last stop', async () => {
    const handle = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: nextStakingEra(), startMs: ERA_START_MS },
      ledgers: { [stakingAccountA.accountId]: { total: '100', active: '100' } },
    });

    // No apis on the scenario — the aggregate stays idle so the only thing
    // touching the pool is this test.
    const { env } = await startScenario({ chains: [polkadotAssetHubChain] });

    const request = {
      chainId: POLKADOT_AH,
      api: handle.api,
      accounts: [stakingAccountA.accountId, stakingAccountB.accountId],
    };
    const key = stakingResource.createKey(request);

    await allSettled(stakingResource.start, { scope: env.scope, params: request });
    await allSettled(stakingResource.start, { scope: env.scope, params: { ...request } });

    expect(handle.subscribeCalls().ledger).toBe(1);
    expect(handle.liveSubscriptions().ledger).toBe(1);

    await allSettled(stakingResource.stop, { scope: env.scope, params: key });

    // One consumer left — the subscription must stay alive.
    expect(handle.liveSubscriptions().ledger).toBe(1);

    await allSettled(stakingResource.stop, { scope: env.scope, params: key });

    expect(handle.liveSubscriptions().ledger).toBe(0);
  });

  it('should treat a different stash set as a different key', async () => {
    const handle = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: nextStakingEra(), startMs: ERA_START_MS },
    });

    const { env } = await startScenario({ chains: [polkadotAssetHubChain] });

    const single = { chainId: POLKADOT_AH, api: handle.api, stashes: [stakingAccountA.accountId] };
    const both = {
      chainId: POLKADOT_AH,
      api: handle.api,
      stashes: [stakingAccountA.accountId, stakingAccountB.accountId],
    };

    await allSettled(nominationsResource.start, { scope: env.scope, params: single });
    await allSettled(nominationsResource.start, { scope: env.scope, params: both });

    expect(handle.subscribeCalls().nominators).toBe(2);
    expect(handle.liveSubscriptions().nominators).toBe(2);

    await allSettled(nominationsResource.stop, { scope: env.scope, params: nominationsResource.createKey(single) });

    expect(handle.liveSubscriptions().nominators).toBe(1);

    await allSettled(nominationsResource.stop, { scope: env.scope, params: nominationsResource.createKey(both) });

    expect(handle.liveSubscriptions().nominators).toBe(0);
  });

  it('should start the new era keys and stop the old ones when the era rolls over', async () => {
    const era = nextStakingEra();
    const handle = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: era, startMs: ERA_START_MS },
      ledgers: { [stakingAccountA.accountId]: { total: '100', active: '100' } },
      nominations: { [stakingAccountA.accountId]: { targets: [validatorOne], submittedIn: era - 10 } },
      exposures: {
        [era]: {
          [validatorOne]: { total: '100', own: '0', others: [{ who: stakingAccountA.accountId, value: '100' }] },
        },
        [era + 1]: {
          [validatorOne]: { total: '100', own: '0', others: [{ who: stakingAccountA.accountId, value: '100' }] },
        },
      },
      prefs: { [validatorOne]: { commission: 100_000_000 } },
    });

    // The apis are pushed after the watchers are installed — the pool starts
    // its first keys the instant an api lands.
    const { env, settle } = await startScenario({ chains: [polkadotAssetHubChain] });

    const started: Record<string, ResourceRequestKey[]> = { exposures: [], validators: [], pages: [] };
    const stopped: Record<string, ResourceRequestKey[]> = { exposures: [], validators: [], pages: [] };

    createWatch({
      unit: exposuresResource.start,
      scope: env.scope,
      fn: (params) => started['exposures']?.push(exposuresResource.createKey(params)),
    });
    createWatch({
      unit: exposuresResource.stop,
      scope: env.scope,
      fn: (key) => stopped['exposures']?.push(key),
    });
    createWatch({
      unit: validatorsResource.start,
      scope: env.scope,
      fn: (params) => started['validators']?.push(validatorsResource.createKey(params)),
    });
    createWatch({
      unit: validatorsResource.stop,
      scope: env.scope,
      fn: (key) => stopped['validators']?.push(key),
    });
    createWatch({
      unit: exposurePagesResource.start,
      scope: env.scope,
      fn: (params) => started['pages']?.push(exposurePagesResource.createKey(params)),
    });
    createWatch({
      unit: exposurePagesResource.stop,
      scope: env.scope,
      fn: (key) => stopped['pages']?.push(key),
    });

    await allSettled(networkModel.$apis, { scope: env.scope, params: { [POLKADOT_AH]: handle.api } });
    await settle();

    const firstExposures = exposuresResource.createKey({ chainId: POLKADOT_AH, api: handle.api, era });
    const secondExposures = exposuresResource.createKey({ chainId: POLKADOT_AH, api: handle.api, era: era + 1 });
    const firstPages = exposurePagesResource.createKey({
      chainId: POLKADOT_AH,
      api: handle.api,
      era,
      validators: [validatorOne],
    });

    expect(started['exposures']).toEqual([firstExposures]);
    expect(stopped['exposures']).toEqual([]);
    expect(started['pages']).toEqual([firstPages]);

    handle.setActiveEra(era + 1, ERA_START_MS);
    await settle();

    // The era is part of every key, so the roll-over both opens the new request
    // and releases the old one — nothing is left holding a refcount.
    expect(started['exposures']).toEqual([firstExposures, secondExposures]);
    expect(stopped['exposures']).toEqual([firstExposures]);

    expect(started['validators']).toHaveLength(2);
    expect(stopped['validators']).toEqual([
      validatorsResource.createKey({ chainId: POLKADOT_AH, api: handle.api, era, timelineApi: handle.api }),
    ]);

    expect(started['pages']).toHaveLength(2);
    expect(stopped['pages']).toEqual([firstPages]);
  });

  it('should release every chain subscription on reset', async () => {
    const era = nextStakingEra();
    const handle = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: era, startMs: ERA_START_MS },
      ledgers: { [stakingAccountA.accountId]: { total: '100', active: '100' } },
    });

    const { env, settle } = await startScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: handle.api },
    });

    await settle();

    expect(handle.liveSubscriptions()).toEqual({
      activeEra: 1,
      ledger: 1,
      nominators: 1,
      minNominatorBond: 1,
    });

    await env.executeEventVoid(stakingPositions.reset);
    await settle();

    expect(handle.liveSubscriptions()).toEqual({
      activeEra: 0,
      ledger: 0,
      nominators: 0,
      minNominatorBond: 0,
    });

    // Already released — the afterEach reset must stay a no-op.
    scenario = null;
    await env.cleanup();
  });

  it('should not re-subscribe when the nominated set re-emits unchanged', async () => {
    const era = nextStakingEra();
    const handle = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: era, startMs: ERA_START_MS },
      ledgers: { [stakingAccountA.accountId]: { total: '100', active: '100' } },
      nominations: { [stakingAccountA.accountId]: { targets: [validatorOne], submittedIn: era - 10 } },
      exposures: {
        [era]: {
          [validatorOne]: { total: '100', own: '0', others: [{ who: stakingAccountA.accountId, value: '100' }] },
        },
      },
      prefs: { [validatorOne]: { commission: 100_000_000 } },
    });

    const { env, settle } = await startScenario({ chains: [polkadotAssetHubChain] });

    const startedPages: ResourceRequestKey[] = [];
    createWatch({
      unit: exposurePagesResource.start,
      scope: env.scope,
      fn: (params) => startedPages.push(exposurePagesResource.createKey(params)),
    });

    await allSettled(networkModel.$apis, { scope: env.scope, params: { [POLKADOT_AH]: handle.api } });
    await settle();
    expect(startedPages).toHaveLength(1);

    // A live subscription re-emits an identical payload on every block; the
    // pooled exposure-pages request must not churn because of it.
    handle.emit();
    await settle();

    expect(startedPages).toHaveLength(1);
  });
});
