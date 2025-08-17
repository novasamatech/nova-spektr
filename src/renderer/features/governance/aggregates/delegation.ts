import { type BN, BN_ZERO } from '@polkadot/util';
import { uniq } from 'lodash';

import { type DelegationBalanceMap, type DelegationTracksMap } from '@/shared/core';
import { entries, toAccountId } from '@/shared/lib/utils';
import { votingService } from '@/entities/governance';
import { permissionUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { networkSelectorModel } from '../model/networkSelector';

import { votingAggregate } from './voting';

const $delegatedVotingPower = votingAggregate.$activeWalletVotes.map((voting) => {
  let total = BN_ZERO;

  for (const walletVotes of Object.values(voting)) {
    let maxDelegatingPower: BN | null = null;

    for (const vote of Object.values(walletVotes)) {
      if (!votingService.isDelegating(vote)) continue;

      const votingPower = votingService.calculateVotingPower(vote.balance, vote.conviction);
      if (!maxDelegatingPower || votingPower.gt(maxDelegatingPower)) {
        maxDelegatingPower = votingPower;
      }
    }

    if (maxDelegatingPower) {
      total = total.add(maxDelegatingPower);
    }
  }

  return total;
});

const $activeDelegations = votingAggregate.$activeWalletVotes.map((activeVotes) => {
  const activeBalances: DelegationBalanceMap = {};

  for (const [voterAccountId, delegations] of entries(activeVotes)) {
    for (const delegation of Object.values(delegations)) {
      if (!votingService.isDelegating(delegation)) continue;

      const target = toAccountId(delegation.target);

      if (!activeBalances[target]) {
        activeBalances[target] = {};
      }

      activeBalances[target][voterAccountId] = {
        conviction: delegation.conviction,
        balance: delegation.balance,
      };
    }
  }

  return activeBalances;
});

const $activeTracks = votingAggregate.$activeWalletVotes.map((activeVotes) => {
  const activeTracks: DelegationTracksMap = {};

  for (const [voterAccountId, delegations] of entries(activeVotes)) {
    for (const [track, delegation] of entries(delegations)) {
      if (!votingService.isDelegating(delegation)) continue;

      const target = toAccountId(delegation.target);

      if (!activeTracks[target]) {
        activeTracks[target] = {};
      }

      if (!activeTracks[target][voterAccountId]) {
        activeTracks[target][voterAccountId] = [];
      }

      activeTracks[target][voterAccountId].push(track);
    }
  }

  return activeTracks;
});

const $activeWalletDelegatedTracks = $activeTracks.map((tracks) => {
  return uniq(Object.values(tracks).flatMap((map) => Object.values(map).flat()));
});

const $hasDelegations = $activeDelegations.map((delegations) => Object.values(delegations).length > 0);

const $canDelegate = walletSelect.$selectedWallet.map((wallet) => !!wallet && permissionUtils.canDelegate(wallet));

export const delegationAggregate = {
  $isLoading: votingAggregate.$isLoading,
  $network: networkSelectorModel.$network,

  $canDelegate,
  $hasAccount: networkSelectorModel.$hasAccount,
  $activeDelegations,
  $activeWalletDelegatedTracks,
  $activeTracks,
  $hasDelegations,
  $delegatedVotingPower,
};
