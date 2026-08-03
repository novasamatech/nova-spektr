import { allSettled } from 'effector';
import type * as GraphqlRequestModule from 'graphql-request';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type UnclaimedPayouts, AssetHubChains, payouts } from '@/domains/staking';
import { polkadotAssetHubChain, stakingAccountA, validatorOne, validatorTwo } from '../../fixtures/index';
import {
  type StakingApiHandle,
  type StakingScenario,
  allureMetadata,
  createStakingApi,
  createStakingScenario,
  nextStakingEra,
} from '../../utils/index';

/**
 * Integration tests for unclaimed payouts.
 *
 * The SubQuery indexer is stubbed at the GraphQL client, the chain at the api —
 * everything between (source selection, claimed-page filtering, reward
 * arithmetic and the resource's staleness window) is the real thing.
 *
 * @group integration
 * @group staking
 * @group staking-payouts
 */

const indexer = vi.hoisted(() => {
  type Response = { eraValidatorInfos: { totalCount: number; nodes: unknown[] } };

  const state: { response: Response; requests: number } = {
    response: { eraValidatorInfos: { totalCount: 0, nodes: [] } },
    requests: 0,
  };

  return state;
});

// Only the client is replaced — other modules of the app import `gql` from the
// same package at load time.
vi.mock('graphql-request', async (importOriginal) => ({
  ...(await importOriginal<typeof GraphqlRequestModule>()),
  GraphQLClient: class {
    request() {
      indexer.requests += 1;

      return Promise.resolve(indexer.response);
    }
  },
}));

const POLKADOT_AH = AssetHubChains.POLKADOT_AH;
const ERA_START_MS = 1_700_000_000_000;
const HISTORY_DEPTH = 4;
const STASH = stakingAccountA.accountId;

const REWARD_SOURCES = [{ url: 'https://indexer.test/graphql', addressPrefix: 0 }];

const { payoutsResource } = payouts;

function indexerNode(era: number, validator: AccountId, total: string, own: string) {
  return { era, address: toAddress(validator, { prefix: 0 }), total, own };
}

function setIndexerResponse(nodes: ReturnType<typeof indexerNode>[]) {
  indexer.response = { eraValidatorInfos: { totalCount: nodes.length, nodes } };
}

describe('Staking Payouts - Integration', () => {
  let scenario: StakingScenario | null = null;

  beforeEach(async () => {
    indexer.requests = 0;
    setIndexerResponse([]);
    await allureMetadata({
      epic: 'Staking',
      feature: 'Staking Payouts',
      story: 'Unclaimed payouts',
      severity: 'critical',
    });
  });

  afterEach(async () => {
    if (scenario) {
      await scenario.env.cleanup();
      scenario = null;
    }
    vi.useRealTimers();
  });

  const startScenario = async (handle: StakingApiHandle) => {
    scenario = await createStakingScenario({
      chains: [polkadotAssetHubChain],
      apis: { [POLKADOT_AH]: handle.api },
    });

    return scenario;
  };

  const requestPayouts = async (handle: StakingApiHandle, activeEra: number, rewardSources = REWARD_SOURCES) => {
    const { env } = scenario ?? (await startScenario(handle));

    await allSettled(payoutsResource.start, {
      scope: env.scope,
      params: {
        chainId: POLKADOT_AH,
        api: handle.api,
        stash: STASH,
        activeEra,
        historyDepth: HISTORY_DEPTH,
        rewardSources,
      },
    });

    const cache = env.getState(payoutsResource.$cache);

    return Object.values(cache).at(-1) as UnclaimedPayouts | undefined;
  };

  /**
   * `validatorOne` earned every reward point of era `activeEra - 1` and pays a
   * 10% commission; the stash sits on page 1 of its exposure with 600 of the
   * 1000 total stake.
   *
   * Era share = 1000, commission = 100, leftover = 900, payout = 900 ×
   * 600/1000.
   */
  const EXPECTED_PAYOUT = '540';

  function createPayoutsApi(activeEra: number): StakingApiHandle {
    const paidEra = activeEra - 1;
    const claimedEra = activeEra - 2;

    return createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: activeEra, startMs: ERA_START_MS },
      ledgers: { [STASH]: { total: '600', active: '600' } },
      nominations: { [STASH]: { targets: [validatorOne], submittedIn: activeEra - 20 } },
      exposures: {
        [paidEra]: {
          [validatorOne]: {
            total: '1000',
            own: '0',
            pages: [[{ who: validatorTwo, value: '400' }], [{ who: STASH, value: '600' }]],
          },
        },
        [claimedEra]: {
          [validatorOne]: { total: '1000', own: '0', pages: [[{ who: STASH, value: '1000' }]] },
        },
      },
      prefs: { [validatorOne]: { commission: 100_000_000 } },
      rewardPoints: {
        [paidEra]: { total: 100, individual: { [validatorOne]: 100 } },
        [claimedEra]: { total: 100, individual: { [validatorOne]: 100 } },
      },
      erasValidatorReward: { [paidEra]: '1000', [claimedEra]: '1000' },
      // The single page of the older era was already paid out.
      claimedRewards: { [`${claimedEra}-${validatorOne}`]: [0] },
    });
  }

  it('should resolve indexer-backed payouts with the real exposure page index', async () => {
    const activeEra = nextStakingEra();
    const handle = createPayoutsApi(activeEra);

    setIndexerResponse([
      indexerNode(activeEra - 1, validatorOne, '1000', '0'),
      indexerNode(activeEra - 2, validatorOne, '1000', '0'),
    ]);

    await startScenario(handle);
    const result = await requestPayouts(handle, activeEra);

    expect(result?.source).toBe('subquery');
    // The already-claimed era is dropped, the open one is paid on its real page.
    expect(result?.payouts).toEqual([
      { era: activeEra - 1, validator: validatorOne, page: 1, amount: EXPECTED_PAYOUT },
    ]);
    expect(result?.total).toBe(EXPECTED_PAYOUT);
  });

  it('should fall back to the chain scan when no indexer is configured', async () => {
    const activeEra = nextStakingEra();
    const handle = createPayoutsApi(activeEra);

    await startScenario(handle);
    const result = await requestPayouts(handle, activeEra, []);

    // Nomination targets are the only reachable exposures without an indexer.
    expect(result?.source).toBe('chain');
    expect(result?.payouts).toEqual([
      { era: activeEra - 1, validator: validatorOne, page: 1, amount: EXPECTED_PAYOUT },
    ]);
    expect(indexer.requests).toBe(0);
  });

  it('should report `unavailable` when neither the indexer nor the chain can answer', async () => {
    const activeEra = nextStakingEra();
    const handle = createStakingApi({
      chainId: POLKADOT_AH,
      activeEra: { index: activeEra, startMs: ERA_START_MS },
      // No nominations and no exposures — nothing to scan.
      nominations: { [STASH]: null },
    });

    await startScenario(handle);
    const result = await requestPayouts(handle, activeEra, []);

    expect(result).toEqual({ total: '0', payouts: [], source: 'unavailable' });
  });

  it('should report an empty but known result when the indexer answers with nothing', async () => {
    const activeEra = nextStakingEra();
    const handle = createPayoutsApi(activeEra);

    setIndexerResponse([]);

    await startScenario(handle);
    const result = await requestPayouts(handle, activeEra);

    // An indexer that answered "no exposures" is still an answer.
    expect(result).toEqual({ total: '0', payouts: [], source: 'subquery' });
    expect(indexer.requests).toBe(1);
  });

  it('should serve the cached result inside the five-minute window and refetch after it', async () => {
    // Only `Date` is faked — the resource cache is wall-clock based, while the
    // request pool resolves through promises that must keep running.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(ERA_START_MS);

    const activeEra = nextStakingEra();
    const handle = createPayoutsApi(activeEra);

    setIndexerResponse([indexerNode(activeEra - 1, validatorOne, '1000', '0')]);

    await startScenario(handle);
    expect((await requestPayouts(handle, activeEra))?.total).toBe(EXPECTED_PAYOUT);
    expect(indexer.requests).toBe(1);

    // The payout lands on chain.
    handle.state.claimedRewards[`${activeEra - 1}-${validatorOne}`] = [0, 1];

    await requestPayouts(handle, activeEra);
    // Still inside the window — the chain was not asked again.
    expect(indexer.requests).toBe(1);

    vi.setSystemTime(ERA_START_MS + 5 * 60 * 1000 + 1);

    const refreshed = await requestPayouts(handle, activeEra);

    expect(indexer.requests).toBe(2);
    expect(refreshed).toEqual({ total: '0', payouts: [], source: 'subquery' });
  });
});
