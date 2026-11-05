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
import { type MonthlyRewards, type MonthlyRewardsParams, rewards, rewardsService } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { useRawPayoutsSince, useRawRewardPayouts } from '../useRawRewardPayouts';

type FetchMonthlyRewards = (params: { accounts: AccountId[] }) => Promise<MonthlyRewards>;

/**
 * The indexer read is the boundary: the resource cache it lands in and the hook
 * reading it back are the real thing.
 */
const fetchRecords = vi.hoisted(() => vi.fn<FetchMonthlyRewards>());

vi.mock('@/domains/staking/rewards/service', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();

  return { ...actual, fetchMonthlyRewards: fetchRecords };
});

// The pool `start`s requests outside the fork; the entries are seeded through
// the scoped `fetch` instead.
vi.mock('../useResourcePool', () => ({ useResourcePool: () => undefined }));

const { monthlyRewardsResource } = rewards;

const POLKADOT_AH = polkadotAssetHubChain.chainId;
const KUSAMA_AH = kusamaAssetHubChainId;

/** A chain with an indexer to ask — one without any is never requested. */
const withRewardSource = (chain: Chain): Chain => ({
  ...chain,
  externalApi: { [ExternalType.HISTORY]: [{ type: 'subquery', url: `https://${chain.chainId}.test` }] },
});

const kusamaAssetHubChain: Chain = {
  ...kusamaChain,
  chainId: KUSAMA_AH,
  parentId: kusamaChainId,
  name: 'Kusama Asset Hub',
};

const wrapperFor = (scope: Scope) => {
  const Wrapper = ({ children }: PropsWithChildren) => <Provider value={scope}>{children}</Provider>;

  return Wrapper;
};

const seedHistory = async (scope: Scope, params: MonthlyRewardsParams, result: MonthlyRewards) => {
  fetchRecords.mockResolvedValueOnce(result);
  await allSettled(monthlyRewardsResource.fetch, { scope, params });
};

describe('useRawRewardPayouts · completeness', () => {
  beforeEach(() => {
    fetchRecords.mockReset();
  });

  it('names a chain whose history has not arrived yet as pending', async () => {
    const account = createAccountId('raw-payouts-pending');
    const chains: Record<ChainId, Chain> = {
      [POLKADOT_AH]: withRewardSource(polkadotAssetHubChain),
      [KUSAMA_AH]: withRewardSource(kusamaAssetHubChain),
    };
    const scope = fork({ values: [[networkModel.$chains, chains]] });
    const { result: since } = renderHook(() => useRawPayoutsSince());

    await seedHistory(
      scope,
      {
        chainId: POLKADOT_AH,
        accounts: [account],
        rewardSources: rewardsService.collectChainRewardSources(chains[POLKADOT_AH]!, chains, 'staking-chain'),
        since: since.current,
      },
      { records: [], completeness: 'complete' },
    );

    const requests = [
      { chainId: POLKADOT_AH, accountIds: [account] },
      { chainId: KUSAMA_AH, accountIds: [account] },
    ];
    const { result } = renderHook(() => useRawRewardPayouts(requests), { wrapper: wrapperFor(scope) });

    expect(result.current.pendingChains).toEqual([KUSAMA_AH]);
    expect(result.current.incompleteChains).toEqual([]);
  });

  it('counts a chain with no source to ask as incomplete, not as a history without payouts', () => {
    const account = createAccountId('raw-payouts-no-source');
    const chains: Record<ChainId, Chain> = {
      [KUSAMA_AH]: { ...kusamaAssetHubChain, externalApi: undefined, parentId: undefined },
    };
    const scope = fork({ values: [[networkModel.$chains, chains]] });

    const requests = [{ chainId: KUSAMA_AH, accountIds: [account] }];
    const { result } = renderHook(() => useRawRewardPayouts(requests), { wrapper: wrapperFor(scope) });

    expect(result.current.incompleteChains).toEqual([KUSAMA_AH]);
    expect(result.current.pendingChains).toEqual([]);
  });
});
