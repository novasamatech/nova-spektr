import { combine, createEvent, sample } from 'effector';

import { type Address, type TrackId, type VotingMap } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { votingModel } from '@/entities/governance';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
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

const $possibleAccountsForVoting = combine(
  {
    wallet: walletModel.$activeWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ wallet, chain }) => {
    if (nullable(wallet) || nullable(chain)) return [];

    if (!walletUtils.isPolkadotVault(wallet)) {
      return wallet.accounts.filter((a) => accountUtils.isChainAndCryptoMatch(a, chain));
    }

    const accounts = wallet.accounts.filter((a) => {
      return (
        accountUtils.isChainAndCryptoMatch(a, chain) &&
        (accountUtils.isShardAccount(a) || accountUtils.isChainAccount(a))
      );
    });

    if (accounts.length > 0) return accounts;

    return wallet.accounts.filter((a) => accountUtils.isBaseAccount(a) && accountUtils.isChainAndCryptoMatch(a, chain));
  },
);

sample({
  clock: requestVoting,
  source: {
    network: networkSelectorModel.$network,
    tracks: tracksAggregate.$tracks,
  },
  filter: ({ network }) => nonNullable(network),
  fn: ({ network, tracks: allTracks }, { addresses, tracks }) => ({
    api: network!.api,
    tracks: tracks || Object.keys(allTracks),
    addresses,
  }),
  target: votingModel.events.subscribeVoting,
});

sample({
  clock: [tracksAggregate.$tracks, walletModel.$activeWallet],
  source: {
    wallet: walletModel.$activeWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ wallet, chain }) => nonNullable(wallet) && nonNullable(chain),
  fn: ({ wallet, chain }) => ({
    addresses: accountUtils.getAddressesForWallet(wallet!, chain!),
  }),
  target: requestVoting,
});

export const votingAggregate = {
  $activeWalletVotes,
  $possibleAccountsForVoting,
  $voting: votingModel.$voting,
  $isLoading: votingModel.$isLoading,

  events: {
    requestVoting,
  },
};
