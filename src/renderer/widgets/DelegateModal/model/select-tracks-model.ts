import { combine, createEvent, createStore, restore, sample } from 'effector';

import { type Account, type Chain } from '@/shared/core';
import { addUniqueItems, removeItemsFromCollection, toAddress } from '@/shared/lib/utils';
import { votingService } from '@/entities/governance';
import { accountUtils, walletModel } from '@/entities/wallet';
import { delegationAggregate, votingAggregate } from '@/features/governance';

const formInitiated = createEvent<Chain>();
const formSubmitted = createEvent<{ tracks: number[]; accounts: Account[] }>();
const trackToggled = createEvent<number>();
const tracksSelected = createEvent<number[]>();
const accountsChanged = createEvent<Account[]>();

const $chain = restore(formInitiated, null);

const $tracks = createStore<number[]>([]).reset(formInitiated);
const $accounts = createStore<Account[]>([]);

const $votedTracks = combine(
  {
    votes: votingAggregate.$activeWalletVotes,
  },
  ({ votes }) => {
    const activeTracks = new Set<string>();

    for (const voteList of Object.values(votes)) {
      for (const [track, vote] of Object.entries(voteList)) {
        if (votingService.isCasting(vote)) {
          activeTracks.add(track);
        }
      }
    }

    return [...activeTracks];
  },
);

const $availableAccounts = combine(
  {
    wallet: walletModel.$activeWallet,
    delegations: delegationAggregate.$activeDelegations,
    chain: delegationAggregate.$chain,
  },
  ({ wallet, delegations, chain }) => {
    if (!wallet || !chain) return [];

    return wallet.accounts
      .filter((a) => accountUtils.isNonBaseVaultAccount(a, wallet) && accountUtils.isChainIdMatch(a, chain.chainId))
      .filter((account) => !delegations[toAddress(account.accountId, { prefix: chain.addressPrefix })]);
  },
);

sample({
  clock: formInitiated,
  source: walletModel.$activeWallet,
  filter: (wallet) => !!wallet,
  fn: (wallet) => {
    return wallet!.accounts;
  },
  target: $accounts,
});

sample({
  clock: trackToggled,
  source: $tracks,
  fn: (tracks, track) => {
    if (tracks.includes(track)) {
      return tracks.filter((t) => t !== track);
    }

    return [...tracks, track];
  },
  target: $tracks,
});

sample({
  clock: accountsChanged,
  target: $accounts,
});

sample({
  clock: tracksSelected,
  source: $tracks,
  fn: (tracks, newTracks) => {
    if (newTracks.every((t) => tracks.includes(t))) {
      return removeItemsFromCollection(tracks, newTracks);
    }

    return addUniqueItems(tracks, newTracks);
  },
  target: $tracks,
});

export const selectTracksModel = {
  $tracks,
  $accounts,
  $availableAccounts,

  $chain,
  $votedTracks,

  events: {
    formInitiated,
    trackToggled,
    tracksSelected,
    accountsChanged,
  },

  output: {
    formSubmitted,
  },
};
