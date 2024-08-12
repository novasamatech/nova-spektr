import { BN } from '@polkadot/util';
import { combine } from 'effector';

import { type Address, type Conviction, type DelegatingVoting } from '@/shared/core';
import { votingService } from '@entities/governance';
import { networkSelectorModel } from '../model/networkSelector';
import { votingAssetModel } from '../model/votingAsset';

import { votingAggregate } from './voting';

const $totalDelegations = combine(
  {
    voting: votingAggregate.$activeWalletVotes,
  },
  ({ voting }): string => {
    return Object.values(voting)
      .reduce((acc, value) => {
        const voting = Object.values(value).find(votingService.isDelegating);

        return voting ? acc.iadd(voting.balance) : acc;
      }, new BN(0))
      .toString();
  },
);

const $activeDelegations = combine(
  {
    activeVotes: votingAggregate.$activeWalletVotes,
  },
  ({ activeVotes }) => {
    const activeBalances = new Map<Address, { conviction: Conviction; balance: string }>();

    Object.entries(activeVotes).forEach(([address, delegations]) => {
      const delegation = Object.values(delegations).find((vote) => votingService.isDelegating(vote));

      if (delegation) {
        activeBalances.set(address, {
          conviction: (delegation as DelegatingVoting).conviction.toString() as Conviction,
          balance: (delegation as DelegatingVoting).balance.toString(),
        });
      }
    });

    return Object.fromEntries(activeBalances);
  },
);

export const delegationAggregate = {
  $isLoading: votingAggregate.$isLoading,
  $asset: votingAssetModel.$votingAsset,
  $chain: networkSelectorModel.$governanceChain,

  $activeDelegations,
  $totalDelegations,
};
