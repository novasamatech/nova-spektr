import { type ApiPromise } from '@polkadot/api';
import { TypeRegistry, u32 } from '@polkadot/types';
import { act, renderHook } from '@testing-library/react';
import { type Scope, allSettled, fork } from 'effector';
import { Provider, useUnit } from 'effector-react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chain, type ChainId } from '@/shared/core';
import {
  createAccountId,
  kusamaAssetHubChainId,
  kusamaChain,
  kusamaChainId,
  polkadotAssetHubChain,
} from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type EraRewardsParams,
  type EraValidatorRewards,
  type StakingPosition,
  type eraRewardsService,
  eraRewards,
} from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { DEFAULT_REWARD_WINDOW, windowEraRange } from '../../lib/reward-period';
import { useValidatorRewards } from '../useValidatorRewards';

import { $eraCache } from './domainMocks';

type EraRewardsServiceModule = { getEraValidatorRewards: typeof eraRewardsService.getEraValidatorRewards };

/**
 * The era replay is the boundary: everything from the resource's request cache
 * and `invalidate` down to the hook's own `retry` is the real thing.
 */
const replay = vi.hoisted(() => vi.fn<EraRewardsServiceModule['getEraValidatorRewards']>());

vi.mock('@/domains/staking/era-rewards/service', async (importOriginal) => {
  const actual = await importOriginal<EraRewardsServiceModule>();

  return { ...actual, getEraValidatorRewards: replay };
});

vi.mock('../useChainEras', async () => {
  const { $eraCache } = await import('./domainMocks');

  return { useChainEras: () => useUnit($eraCache), useEraDurations: () => ({}) };
});

// The pool `start`s requests outside the fork; the entries are seeded through
// the scoped `fetch` instead.
vi.mock('../useResourcePool', () => ({ useResourcePool: () => undefined }));

const { eraRewardsResource } = eraRewards;

const POLKADOT_AH = polkadotAssetHubChain.chainId;
const KUSAMA_AH = kusamaAssetHubChainId;

const kusamaAssetHubChain: Chain = {
  ...kusamaChain,
  chainId: KUSAMA_AH,
  parentId: kusamaChainId,
  name: 'Kusama Asset Hub',
};

const chains: Record<ChainId, Chain> = {
  [POLKADOT_AH]: polkadotAssetHubChain,
  [KUSAMA_AH]: kusamaAssetHubChain,
};

const HISTORY_DEPTH = 84;

const registry = new TypeRegistry();
const api = { consts: { staking: { historyDepth: new u32(registry, HISTORY_DEPTH) } } } as unknown as ApiPromise;
const apis: Record<ChainId, ApiPromise> = { [POLKADOT_AH]: api, [KUSAMA_AH]: api };

const ERAS: Record<ChainId, number> = { [POLKADOT_AH]: 100, [KUSAMA_AH]: 200 };

const validator = createAccountId('era-rewards-validator');

const position = (chainId: ChainId, accountId: AccountId): StakingPosition => ({
  accountId,
  chainId,
  stake: { accountId, chainId, controller: accountId, stash: accountId, active: '1', total: '1', unlocking: [] },
  status: 'active',
  statusReason: null,
  kind: 'nominator',
  validator: null,
  nominations: [],
  activeValidators: [],
  unbonding: [],
  redeemable: '0',
  totalUnbonding: '0',
  payee: 'Staked',
  payeeLoaded: true,
});

const request = (chainId: ChainId, stash: AccountId): EraRewardsParams => {
  const eraRange = windowEraRange(DEFAULT_REWARD_WINDOW, {
    activeEra: ERAS[chainId]!,
    eraDurationMs: null,
    historyDepth: HISTORY_DEPTH,
  });
  if (!eraRange) throw new Error('the default window always has closed eras here');

  return { chainId, api, stashes: [stash], ...eraRange, rewardSources: [] };
};

const answer = (stash: AccountId, completeness: EraValidatorRewards['completeness']): EraValidatorRewards => ({
  rewards:
    completeness === 'unavailable' ? [] : [{ era: 99, validator, accountId: stash, amount: '10', isSelf: false }],
  completeness,
});

const wrapperFor = (scope: Scope) => {
  const Wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;

  return Wrapper;
};

const forkScope = () =>
  fork({
    values: [
      [networkModel.$chains, chains],
      [networkModel.$apis, apis],
      [$eraCache, ERAS],
    ],
  });

/**
 * Lands an answer for the chain in the scope's cache, the way a first replay
 * would.
 */
const seedReplay = async (scope: Scope, params: EraRewardsParams, result: EraValidatorRewards) => {
  replay.mockResolvedValueOnce(result);
  await allSettled(eraRewardsResource.fetch, { scope, params });
};

describe('useValidatorRewards · completeness', () => {
  beforeEach(() => {
    replay.mockReset();
  });

  it('names the chains whose attribution did not answer completely', async () => {
    const polkadotStash = createAccountId('earned-polkadot');
    const kusamaStash = createAccountId('earned-kusama');
    const scope = forkScope();

    await seedReplay(scope, request(POLKADOT_AH, polkadotStash), answer(polkadotStash, 'partial'));
    await seedReplay(scope, request(KUSAMA_AH, kusamaStash), answer(kusamaStash, 'complete'));

    const positions = [position(POLKADOT_AH, polkadotStash), position(KUSAMA_AH, kusamaStash)];
    const { result } = renderHook(() => useValidatorRewards(positions, DEFAULT_REWARD_WINDOW), {
      wrapper: wrapperFor(scope),
    });

    expect(result.current.pendingChains).toEqual([]);
    expect(result.current.incompleteChains).toEqual([POLKADOT_AH]);
    // What the partial answer found is kept — it is real, only not the whole.
    expect(result.current.rewards.map((reward) => reward.chainId).sort()).toEqual([POLKADOT_AH, KUSAMA_AH].sort());
  });

  it('reports an attribution that could not be loaded as incomplete, not as nothing earned', async () => {
    const polkadotStash = createAccountId('unavailable-polkadot');
    const scope = forkScope();

    await seedReplay(scope, request(POLKADOT_AH, polkadotStash), answer(polkadotStash, 'unavailable'));

    const positions = [position(POLKADOT_AH, polkadotStash)];
    const { result } = renderHook(() => useValidatorRewards(positions, DEFAULT_REWARD_WINDOW), {
      wrapper: wrapperFor(scope),
    });

    expect(result.current.rewards).toEqual([]);
    expect(result.current.pendingChains).toEqual([]);
    expect(result.current.incompleteChains).toEqual([POLKADOT_AH]);
  });

  it('retry re-runs only the attributions that did not answer completely', async () => {
    const polkadotStash = createAccountId('retry-earned-polkadot');
    const kusamaStash = createAccountId('retry-earned-kusama');
    const scope = forkScope();

    await seedReplay(scope, request(POLKADOT_AH, polkadotStash), answer(polkadotStash, 'unavailable'));
    await seedReplay(scope, request(KUSAMA_AH, kusamaStash), answer(kusamaStash, 'complete'));

    const positions = [position(POLKADOT_AH, polkadotStash), position(KUSAMA_AH, kusamaStash)];
    const { result } = renderHook(() => useValidatorRewards(positions, DEFAULT_REWARD_WINDOW), {
      wrapper: wrapperFor(scope),
    });

    replay.mockClear();
    replay.mockResolvedValue(answer(polkadotStash, 'complete'));

    await act(() => result.current.retry());

    expect(replay).toHaveBeenCalledTimes(1);
    expect(replay.mock.calls[0]![0]).toMatchObject({ stashes: [polkadotStash] });
    expect(result.current.incompleteChains).toEqual([]);
    expect(result.current.rewards.map((reward) => reward.chainId).sort()).toEqual([POLKADOT_AH, KUSAMA_AH].sort());
  });
});
