import { BN } from '@polkadot/util';
import { combine } from 'effector';

import { type Address, type Conviction } from '@/shared/core';
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

const $activeDelegations = votingAggregate.$activeWalletVotes.map((activeVotes) => {
  const activeBalances: Record<Address, { conviction: Conviction; balance: BN }> = {};

  for (const [address, delegations] of Object.entries(activeVotes)) {
    const delegation = Object.values(delegations).find(votingService.isDelegating);

    if (delegation) {
      activeBalances[address] = {
        conviction: delegation.conviction,
        balance: delegation.balance,
      };
    }
  }

  return activeBalances;
});

export const delegationAggregate = {
  $isLoading: votingAggregate.$isLoading,
  $asset: votingAssetModel.$votingAsset,
  $chain: networkSelectorModel.$governanceChain,

  $activeDelegations,
  $totalDelegations,
};
