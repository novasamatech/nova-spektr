import { combine, sample } from 'effector';

import { type VotingMap } from '@shared/core';
import { accountUtils, walletModel } from '@entities/wallet';
import { votingModel } from '@entities/governance';
import { tracksAggregate } from './tracks';
import { networkSelectorModel } from '../model/networkSelector';

const $currentWalletVoting = combine(
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

    return addresses.reduce<VotingMap>((acc, address) => {
      acc[address] = voting[address];

      return acc;
    }, {});
  },
);

sample({
  clock: walletModel.$activeWallet,
  source: {
    tracks: tracksAggregate.$tracks,
    api: networkSelectorModel.$governanceChainApi,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ api, chain, tracks }, wallet) => !!api && !!chain && !!wallet,
  fn: ({ api, chain, tracks }, wallet) => {
    return {
      api: api!,
      tracksIds: Object.keys(tracks),
      addresses: accountUtils.getAddressesForWallet(wallet!, chain!),
    };
  },
  target: votingModel.events.requestVoting,
});

sample({
  clock: tracksAggregate.events.requestDone,
  source: walletModel.$activeWallet,
  fn: (wallet, { params, result }) => {
    return {
      api: params.api,
      tracksIds: Object.keys(result),
      addresses: accountUtils.getAddressesForWallet(wallet!, params.chain),
    };
  },
  target: votingModel.events.requestVoting,
});

export const votingAggregate = {
  $currentWalletVoting,
  $voting: votingModel.$voting,
};
