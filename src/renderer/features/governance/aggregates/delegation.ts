import { BN } from '@polkadot/util';
import { combine } from 'effector';
import uniq from 'lodash/uniq';

import { type DelegatingVoting, type DelegationBalanceMap, type DelegationTracksMap } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { votingService } from '@/entities/governance';
import { permissionUtils, walletModel } from '@/entities/wallet';
import { networkSelectorModel } from '../model/networkSelector';

import { votingAggregate } from './voting';

const $totalDelegations = combine(
  {
    voting: votingAggregate.$activeWalletVotes,
  },
  ({ voting }): string => {
    return Object.values(voting)
      .reduce((acc, value) => {
        const voting = Object.values(value).reduce<DelegatingVoting | undefined>((acc, vote) => {
          if (votingService.isDelegating(vote)) {
            return acc?.balance.gt(vote.balance) ? acc : vote;
          }

          return acc;
        }, undefined);

        return voting ? acc.iadd(voting.balance) : acc;
      }, new BN(0))
      .toString();
  },
);

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
