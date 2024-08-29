import { BN } from '@polkadot/util';
import { combine } from 'effector';

import { type Address, type Conviction } from '@/shared/core';
import { permissionUtils, walletModel } from '@/entities/wallet';
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
  const activeBalances: Record<Address, Record<Address, { conviction: Conviction; balance: BN }>> = {};

  for (const [address, delegations] of Object.entries(activeVotes)) {
    for (const delegation of Object.values(delegations)) {
      if (!votingService.isDelegating(delegation)) continue;

      if (!activeBalances[delegation.target]) {
        activeBalances[delegation.target] = {};
      }

      activeBalances[delegation.target][address] = {
        conviction: delegation.conviction,
        balance: delegation.balance,
      };
    }
  }

  return activeBalances;
});

const $activeTracks = votingAggregate.$activeWalletVotes.map((activeVotes) => {
  const activeTracks: Record<Address, Record<Address, string[]>> = {};

  for (const [address, delegations] of Object.entries(activeVotes)) {
    for (const [track, delegation] of Object.entries(delegations)) {
      if (!votingService.isDelegating(delegation)) continue;

      if (!activeTracks[delegation.target]) {
        activeTracks[delegation.target] = {};
      }

      if (!activeTracks[delegation.target][address]) {
        activeTracks[delegation.target][address] = [];
      }

      activeTracks[delegation.target][address].push(track);
    }
  }

  return activeTracks;
});

const $hasDelegations = $activeDelegations.map((delegations) => Object.values(delegations).length > 0);

const $canDelegate = walletModel.$activeWallet.map((wallet) => !!wallet && permissionUtils.canDelegate(wallet));

export const delegationAggregate = {
  $isLoading: votingAggregate.$isLoading,
  $asset: votingAssetModel.$votingAsset,
  $chain: networkSelectorModel.$governanceChain,
  $network: networkSelectorModel.$governanceNetwork,

  $canDelegate,
  $hasAccount: networkSelectorModel.$hasAccount,
  $activeDelegations,
  $activeTracks,
  $hasDelegations,
  $totalDelegations,
};
