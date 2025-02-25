import { type ApiPromise } from '@polkadot/api';
import { createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type TrackId, type VotingMap } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { governanceSubscribeService } from '../lib/governanceSubscribeService';
import { createSubscriber } from '../utils/createSubscriber';

type VotingParams = {
  api: ApiPromise;
  tracks: TrackId[];
  accounts: AccountId[];
};

const subscribeVoting = createEvent<VotingParams>();

const {
  subscribe: subscribe,
  received: receiveVoting,
  unsubscribe: unsubscribeVoting,
} = createSubscriber<VotingParams, VotingMap>(({ api, tracks, accounts }, cb) => {
  return governanceSubscribeService.subscribeVotingFor(api, tracks, accounts, cb);
});

const $voting = createStore<VotingMap>({});
const $isLoading = createStore(true);

sample({
  clock: subscribeVoting,
  filter: ({ accounts }) => accounts.length > 0,
  target: subscribe,
});

sample({
  clock: subscribe,
  fn: () => true,
  target: $isLoading,
});

sample({
  clock: receiveVoting,
  fn: () => false,
  target: $isLoading,
});

sample({
  clock: receiveVoting,
  fn: ({ result }) => result,
  target: $voting,
});

export const votingModel = {
  $voting: readonly($voting),
  $isLoading,

  events: {
    subscribeVoting,
    unsubscribeVoting,
  },
};
