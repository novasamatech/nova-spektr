import { combine, createEvent, createStore, restore, sample } from 'effector';

import { type Account, type Chain } from '@/shared/core';
import { addUniqueItems, removeItemsFromCollection, toAddress } from '@/shared/lib/utils';
import { votingService } from '@/entities/governance';
import { accountUtils, walletModel } from '@/entities/wallet';
import { delegationAggregate, tracksAggregate, votingAggregate } from '@/features/governance';
import { adminTracks, fellowshipTracks, governanceTracks, treasuryTracks } from '../lib/constants';

const formInitiated = createEvent<Chain>();
const formSubmitted = createEvent<{ tracks: number[]; accounts: Account[] }>();
const trackToggled = createEvent<number>();
const tracksSelected = createEvent<number[]>();
const accountsChanged = createEvent<Account[]>();

const $chain = restore(formInitiated, null);

const $tracks = createStore<number[]>([]).reset(formInitiated);
const $accounts = createStore<Account[]>([]);

const $availableTracks = combine(tracksAggregate.$tracks, (tracks) => {
  return Object.keys(tracks);
});

const $votedTracks = combine(
  {
    votes: votingAggregate.$activeWalletVotes,
  },
  ({ votes }) => {
    const activeTracks = new Set<string>();

    for (const voteList of Object.values(votes)) {
      for (const [track, vote] of Object.entries(voteList)) {
        if (votingService.isCasting(vote) && !votingService.isUnlockingDelegation(vote)) {
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
  source: $availableAccounts,
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
  source: { tracks: $tracks, votedTracks: $votedTracks },
  fn: ({ tracks, votedTracks }, newTracks) => {
    const resultArray = newTracks.filter((num) => !votedTracks.includes(num.toString()));

    if (resultArray.every((t) => tracks.includes(t))) {
      return removeItemsFromCollection(tracks, resultArray);
    }

    return addUniqueItems(tracks, resultArray);
  },
  target: $tracks,
});

const $tracksGroup = combine($availableTracks, (availableTracks) => {
  const availableTrackIds = new Set(availableTracks);

  return {
    adminTracks: adminTracks.filter((track) => availableTrackIds.has(track.id)),
    governanceTracks: governanceTracks.filter((track) => availableTrackIds.has(track.id)),
    treasuryTracks: treasuryTracks.filter((track) => availableTrackIds.has(track.id)),
    fellowshipTracks: fellowshipTracks.filter((track) => availableTrackIds.has(track.id)),
  };
});

export const selectTracksModel = {
  $tracks,
  $availableTracks,
  $votedTracks,
  $tracksGroup,
  $allTracks: $tracksGroup.map(({ adminTracks, governanceTracks, treasuryTracks, fellowshipTracks }) => {
    return [...adminTracks, ...governanceTracks, ...treasuryTracks, ...fellowshipTracks];
  }),

  $accounts,
  $availableAccounts,
  $chain,

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
