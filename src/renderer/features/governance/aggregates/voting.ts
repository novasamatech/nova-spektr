import { combine, createEvent, sample } from 'effector';

import { type Address, type TrackId, type VotingMap } from '@shared/core';
import { nonNullable } from '@shared/lib/utils';
import { votingModel } from '@entities/governance';
import { accountUtils, walletModel } from '@entities/wallet';
import { networkSelectorModel } from '../model/networkSelector';

import { tracksAggregate } from './tracks';

const requestVoting = createEvent<{ addresses: Address[]; tracks?: TrackId[] }>();

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

sample({
  clock: requestVoting,
  source: {
    api: networkSelectorModel.$governanceChainApi,
  },
  filter: ({ api }) => nonNullable(api),
  fn: ({ api }, { addresses, tracks }) => ({
    api: api!,
    tracks: tracks || [],
    addresses,
  }),
  target: votingModel.events.requestVoting,
});

sample({
  clock: [tracksAggregate.$tracks, walletModel.$activeWallet],
  source: {
    wallet: walletModel.$activeWallet,
    chain: networkSelectorModel.$governanceChain,
    api: networkSelectorModel.$governanceChainApi,
  },
  filter: ({ wallet, chain }) => nonNullable(wallet) && nonNullable(chain),
  fn: ({ wallet, chain }) => ({
    addresses: accountUtils.getAddressesForWallet(wallet!, chain!),
  }),
  target: requestVoting,
});

export const votingAggregate = {
  $activeWalletVotes,
  $voting: votingModel.$voting,
  $isLoading: votingModel.$isLoading,
  $votingUnsub: votingModel.$votingUnsub,

  events: {
    requestVoting: requestVoting,
    requestDone: votingModel.effects.requestVotingFx.done,
    requestPending: votingModel.effects.requestVotingFx.pending,
  },
};
