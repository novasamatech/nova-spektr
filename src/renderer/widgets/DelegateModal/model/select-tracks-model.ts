import { createEvent, createStore, restore, sample } from 'effector';

import { type Account, type Chain } from '@/shared/core';
import { addUniqueItems, removeItemsFromCollection } from '@/shared/lib/utils';
import { walletModel } from '@/entities/wallet';

const formInitiated = createEvent<Chain>();
const formSubmitted = createEvent<{ tracks: number[]; accounts: Account[] }>();
const trackToggled = createEvent<number>();
const tracksSelected = createEvent<number[]>();
const accountsChanged = createEvent<Account[]>();

const $chain = restore(formInitiated, null);

const $tracks = createStore<number[]>([]).reset(formInitiated);
const $accounts = createStore<Account[]>([]);

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
