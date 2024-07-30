import { combine, sample } from 'effector';

import { type Address, type VotingMap } from '@shared/core';
import { votingModel, votingService } from '@entities/governance';
import { accountUtils, walletModel } from '@entities/wallet';
import { networkSelectorModel } from '../model/networkSelector';

import { tracksAggregate } from './tracks';

const $activeWalletVotes = combine(
  {
    voting: votingModel.$voting,
    wallet: walletModel.$activeWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ voting, wallet, chain }): VotingMap => {
    if (!chain || !wallet) {
      return {};
    }

    const addresses = accountUtils.getAddressesForWallet(wallet, chain);
    const res: VotingMap = {};

    for (const address of addresses) {
      if (address in voting) {
        res[address] = voting[address];
      }
    }

    return res;
  },
);

const $delegationsList = combine(
  {
    voting: $activeWalletVotes,
  },
  ({ voting }): Address[] => {
    const res = new Set<Address>();

    for (const voteList of Object.values(voting)) {
      for (const vote of Object.values(voteList)) {
        if (votingService.isDelegating(vote)) {
          res.add(vote.delegating.target);
        }
      }
    }

    return [...res];
  },
);

sample({
  clock: [tracksAggregate.$tracks, walletModel.$activeWallet],
  source: {
    tracks: tracksAggregate.$tracks,
    wallet: walletModel.$activeWallet,
    chain: networkSelectorModel.$governanceChain,
    api: networkSelectorModel.$governanceChainApi,
  },
  filter: ({ wallet, api, chain }) => !!wallet && !!chain && !!api,
  fn: ({ wallet, api, chain, tracks }) => {
    return {
      api: api!,
      tracks: Object.keys(tracks),
      addresses: accountUtils.getAddressesForWallet(wallet!, chain!),
    };
  },
  target: votingModel.events.requestVoting,
});

export const votingAggregate = {
  $activeWalletVotes,
  $delegationsList,
  $voting: votingModel.$voting,
  $isLoading: votingModel.$isLoading,

  events: {
    requestVoting: votingModel.events.requestVoting,
    requestDone: votingModel.effects.requestVotingFx.done,
    requestPending: votingModel.effects.requestVotingFx.pending,
  },
};
