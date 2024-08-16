import { type ApiPromise } from '@polkadot/api';
import { createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Address, type TrackId, type VotingMap } from '@/shared/core';
import { governanceSubscribeService } from '../lib/governanceSubscribeService';
import { createSubscriber } from '../utils/createSubscriber';

type VotingParams = {
  api: ApiPromise;
  tracks: TrackId[];
  addresses: Address[];
};

const {
  subscribe: subscribeVoting,
  received: receiveVoting,
  unsubscribe: unsubscribeVoting,
} = createSubscriber<VotingParams, VotingMap>(({ api, tracks, addresses }, cb) => {
  return governanceSubscribeService.subscribeVotingFor(api, tracks, addresses, (voting) => {
    if (voting) cb(voting);
  });
});

const $voting = createStore<VotingMap>({});
const $isLoading = createStore(true);

sample({
  clock: subscribeVoting,
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
