import { renderHook } from '@testing-library/react';
import { type Scope, allSettled, fork } from 'effector';
import { Provider } from 'effector-react';
import { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Chain, type ChainId, ExternalType } from '@/shared/core';
import {
  createAccountId,
  kusamaAssetHubChainId,
  kusamaChain,
  kusamaChainId,
  polkadotAssetHubChain,
} from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingRewards, type StakingRewardsParams, rewards, rewardsService } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { useRewardsWindow } from '../useRewardsWindow';

type FetchStakingRewards = (params: { accounts: AccountId[] }) => Promise<StakingRewards>;

/**
 * The indexer read is the boundary: the resource cache it lands in and the hook
 * reading it back are the real thing.
 */
const fetchRewards = vi.hoisted(() => vi.fn<FetchStakingRewards>());

vi.mock('@/domains/staking/rewards/service', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();

  return { ...actual, fetchStakingRewards: fetchRewards };
});

// The pool `start`s requests outside the fork; the entries are seeded through
// the scoped `fetch` instead.
vi.mock('../useResourcePool', () => ({ useResourcePool: () => undefined }));

const { stakingRewardsResource } = rewards;

const POLKADOT_AH = polkadotAssetHubChain.chainId;
const KUSAMA_AH = kusamaAssetHubChainId;

/** A chain with an indexer to ask — one without any is never requested. */
const withRewardSource = (chain: Chain): Chain => ({
  ...chain,
  externalApi: { [ExternalType.HISTORY]: [{ type: 'subquery', url: `https://${chain.chainId}.test` }] },
});

const kusamaAssetHubChain: Chain = withRewardSource({
  ...kusamaChain,
  chainId: KUSAMA_AH,
  parentId: kusamaChainId,
  name: 'Kusama Asset Hub',
});

const chains: Record<ChainId, Chain> = {
  [POLKADOT_AH]: withRewardSource(polkadotAssetHubChain),
  [KUSAMA_AH]: kusamaAssetHubChain,
};

const SINCE = 1_700_000_000;
const CHAIN_IDS = [POLKADOT_AH, KUSAMA_AH];

const wrapperFor = (scope: Scope) => {
  const Wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;

  return Wrapper;
};

const request = (chainId: ChainId, accounts: AccountId[]): StakingRewardsParams => ({
  chainId,
  accounts,
  rewardSources: rewardsService.collectChainRewardSources(chains[chainId]!, chains, 'chain-family'),
  since: SINCE,
});

const seedWindow = async (scope: Scope, params: StakingRewardsParams, result: StakingRewards) => {
  fetchRewards.mockResolvedValueOnce(result);
  await allSettled(stakingRewardsResource.fetch, { scope, params });
};

describe('useRewardsWindow · completeness', () => {
  beforeEach(() => {
    fetchRewards.mockReset();
  });

  it('hands every chain its figures together with how far they can be trusted', async () => {
    const account = createAccountId('rewards-window');
    const accounts = [account];
    const scope = fork({ values: [[networkModel.$chains, chains]] });

    await seedWindow(scope, request(POLKADOT_AH, accounts), { rewards: { [account]: '70' }, completeness: 'partial' });
    await seedWindow(scope, request(KUSAMA_AH, accounts), { rewards: { [account]: '0' }, completeness: 'unavailable' });

    const { result } = renderHook(() => useRewardsWindow(CHAIN_IDS, accounts, SINCE), { wrapper: wrapperFor(scope) });

    expect(result.current.byChain[POLKADOT_AH]).toEqual({ [account]: '70' });
    expect(result.current.completeness).toEqual({ [POLKADOT_AH]: 'partial', [KUSAMA_AH]: 'unavailable' });
  });

  it('says nothing about a chain whose window has not answered yet', async () => {
    const account = createAccountId('rewards-window-pending');
    const accounts = [account];
    const scope = fork({ values: [[networkModel.$chains, chains]] });

    await seedWindow(scope, request(POLKADOT_AH, accounts), { rewards: { [account]: '70' }, completeness: 'complete' });

    const { result } = renderHook(() => useRewardsWindow(CHAIN_IDS, accounts, SINCE), { wrapper: wrapperFor(scope) });

    expect(result.current.completeness).toEqual({ [POLKADOT_AH]: 'complete' });
    expect(result.current.byChain[KUSAMA_AH]).toBeUndefined();
  });

  it('counts a chain with no reward source to ask as unavailable, not as zero', async () => {
    const account = createAccountId('rewards-window-no-source');
    const accounts = [account];
    const sourceless: Chain = { ...kusamaAssetHubChain, externalApi: undefined, parentId: undefined };
    const scope = fork({ values: [[networkModel.$chains, { ...chains, [KUSAMA_AH]: sourceless }]] });

    await seedWindow(scope, request(POLKADOT_AH, accounts), { rewards: { [account]: '70' }, completeness: 'complete' });

    const { result } = renderHook(() => useRewardsWindow(CHAIN_IDS, accounts, SINCE), { wrapper: wrapperFor(scope) });

    expect(result.current.completeness).toEqual({ [POLKADOT_AH]: 'complete', [KUSAMA_AH]: 'unavailable' });
    expect(result.current.byChain[KUSAMA_AH]).toBeUndefined();
  });
});
