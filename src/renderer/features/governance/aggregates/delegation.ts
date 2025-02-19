import { BN_ZERO } from '@polkadot/util';
import { combine } from 'effector';
import uniq from 'lodash/uniq';

import { type DelegationBalanceMap, type DelegationTracksMap } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { votingService } from '@/entities/governance';
import { permissionUtils, walletModel } from '@/entities/wallet';
import { networkSelectorModel } from '../model/networkSelector';

import { votingAggregate } from './voting';

const $totalDelegations = votingAggregate.$activeWalletVotes.map((voting) => {
  const total = BN_ZERO;

  for (const walletVotes of Object.values(voting)) {
    let maxDelegatingVote = null;

    for (const vote of Object.values(walletVotes)) {
      if (!votingService.isDelegating(vote)) continue;
      if (!maxDelegatingVote || vote.balance.gt(maxDelegatingVote.balance)) {
        maxDelegatingVote = vote;
      }
    }

    if (maxDelegatingVote) {
      total.iadd(maxDelegatingVote.balance);
    }
  }

  return total;
});

const $activeDelegations = combine(
  {
    activeVotes: votingAggregate.$activeWalletVotes,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ activeVotes, chain }) => {
    const activeBalances: DelegationBalanceMap = {};

    for (const [address, delegations] of Object.entries(activeVotes)) {
      for (const delegation of Object.values(delegations)) {
        if (!votingService.isDelegating(delegation)) continue;

        const target = toAddress(toAccountId(delegation.target), { prefix: chain?.addressPrefix });

        if (!activeBalances[target]) {
          activeBalances[target] = {};
        }

        activeBalances[target][address] = {
          conviction: delegation.conviction,
          balance: delegation.balance,
        };
      }
    }

    return activeBalances;
  },
);

const $activeTracks = combine(
  {
    activeVotes: votingAggregate.$activeWalletVotes,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ activeVotes, chain }) => {
    const activeTracks: DelegationTracksMap = {};

    for (const [address, delegations] of Object.entries(activeVotes)) {
      for (const [track, delegation] of Object.entries(delegations)) {
        if (!votingService.isDelegating(delegation)) continue;

        const target = toAddress(toAccountId(delegation.target), { prefix: chain?.addressPrefix });

        if (!activeTracks[target]) {
          activeTracks[target] = {};
        }

        if (!activeTracks[target][address]) {
          activeTracks[target][address] = [];
        }

        activeTracks[target][address].push(track);
      }
    }

    return activeTracks;
  },
);

const $activeWalletDelegatedTracks = $activeTracks.map((tracks) => {
  return uniq(Object.values(tracks).flatMap((map) => Object.values(map).flat()));
});

const $hasDelegations = $activeDelegations.map((delegations) => Object.values(delegations).length > 0);

const $canDelegate = walletModel.$activeWallet.map((wallet) => !!wallet && permissionUtils.canDelegate(wallet));

export const delegationAggregate = {
  $isLoading: votingAggregate.$isLoading,
  $network: networkSelectorModel.$network,

  $canDelegate,
  $hasAccount: networkSelectorModel.$hasAccount,
  $activeDelegations,
  $activeWalletDelegatedTracks,
  $activeTracks,
  $hasDelegations,
  $totalDelegations,
};
