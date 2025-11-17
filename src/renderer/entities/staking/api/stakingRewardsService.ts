import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { GraphQLClient } from 'graphql-request';
import { useEffect, useMemo, useState } from 'react';

import { type Chain, ExternalType } from '@/shared/core';
import { keys, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';
import { GET_TOTAL_REWARDS } from '../graphql/queries/stakingRewards';
import { type RewardsQuery } from '../graphql/types/stakingRewards';
import { stakingUtils } from '../lib/staking-utils';
import { type IStakingRewardsService, type RewardsMap } from '../lib/types';

type RewardSource = {
  url: string;
  addressPrefix: number;
};

export const useStakingRewards = (accounts: AccountId[], chain: Chain | null): IStakingRewardsService => {
  const chainsMap = useUnit(networkModel.$chains);

  const accountsKey = useMemo(() => accounts.join(','), [accounts]);
  const normalizedAccounts = useMemo<AccountId[]>(() => {
    if (!accountsKey.length) return [];

    return Array.from(new Set(accounts));
  }, [accountsKey]);

  const emptyMap = useMemo<RewardsMap>(() => {
    return normalizedAccounts.reduce<RewardsMap>((acc, account) => {
      acc[account] = '0';

      return acc;
    }, {});
  }, [normalizedAccounts]);

  const [rewards, setRewards] = useState<RewardsMap>(emptyMap);
  const [isRewardsLoading, setRewardsLoading] = useState(false);

  const rewardSources = useMemo<RewardSource[]>(() => {
    if (!chain) return [];

    const uniqueSources = new Map<string, RewardSource>();

    stakingUtils.collectRewardSources(chain, ExternalType.STAKING, uniqueSources);

    if (stakingUtils.isAssetHubChain(chain)) {
      stakingUtils.collectRewardSources(chain, ExternalType.HISTORY, uniqueSources);

      if (chain.parentId) {
        stakingUtils.collectRewardSources(chainsMap[chain.parentId], ExternalType.STAKING, uniqueSources);
      }
    }

    for (const candidate of Object.values(chainsMap)) {
      if (candidate.parentId !== chain.chainId) continue;

      if (!stakingUtils.isAssetHubChain(candidate)) continue;

      stakingUtils.collectRewardSources(candidate, ExternalType.HISTORY, uniqueSources);
    }

    return Array.from(uniqueSources.values());
  }, [chain, chainsMap]);

  useEffect(() => {
    setRewards(emptyMap);
  }, [emptyMap]);

  useEffect(() => {
    if (normalizedAccounts.length === 0 || rewardSources.length === 0) {
      setRewardsLoading(false);
      setRewards(emptyMap);
      return;
    }

    setRewardsLoading(true);

    const buildAddresses = (prefix: number) => {
      return normalizedAccounts.map((accountId) => toAddress(accountId, { prefix }));
    };

    const sums = keys(emptyMap).reduce<Record<AccountId, BN>>((acc, accountId) => {
      acc[accountId] = new BN(emptyMap[accountId]);

      return acc;
    }, {});

    const fetchRewards = async () => {
      await Promise.allSettled(
        rewardSources.map(async ({ url, addressPrefix }) => {
          try {
            const client = new GraphQLClient(url);

            const data = await client.request<RewardsQuery>(GET_TOTAL_REWARDS, {
              addresses: buildAddresses(addressPrefix),
            });

            const nodes = data.accumulatedRewards?.nodes ?? [];

            for (const { id, amount } of nodes) {
              const accountId = toAccountId(id);
              if (!sums[accountId]) {
                sums[accountId] = new BN(0);
              }

              sums[accountId] = sums[accountId].add(new BN(amount));
            }
          } catch (error) {
            console.error('Staking: rewards request failed for', url, error);
          }
        }),
      );

      const aggregated: RewardsMap = keys(sums).reduce<RewardsMap>(
        (acc, accountId) => {
          acc[accountId] = sums[accountId].toString();

          return acc;
        },
        { ...emptyMap },
      );

      setRewards(aggregated);
      setRewardsLoading(false);
    };

    fetchRewards().catch((error) => {
      console.error('Staking: failed to fetch rewards', error);

      setRewards(emptyMap);
      setRewardsLoading(false);
    });

    return;
  }, [normalizedAccounts, emptyMap, rewardSources]);

  return {
    rewards,
    isRewardsLoading,
  };
};
