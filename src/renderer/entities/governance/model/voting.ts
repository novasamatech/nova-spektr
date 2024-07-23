import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Address, type TrackId, type VotingMap } from '@/shared/core';
import { governanceService } from '../lib/governanceService';

const $voting = createStore<VotingMap>({});

type VotingParams = {
  api: ApiPromise;
  tracks: TrackId[];
  addresses: Address[];
};

const requestVoting = createEvent<VotingParams>();

const requestVotingFx = createEffect(({ api, tracks, addresses }: VotingParams): Promise<VotingMap> => {
  return governanceService.getVotingFor(api, tracks, addresses);
});

sample({
  clock: requestVoting,
  target: requestVotingFx,
});

sample({
  clock: requestVotingFx.doneData,
  source: $voting,
  fn: (voting, newVoting) => ({ ...voting, ...newVoting }),
  target: $voting,
});

export const votingModel = {
  $voting: readonly($voting),
  $isLoading: requestVotingFx.pending,

  effects: {
    requestVotingFx,
  },

  events: {
    requestVoting,
  },
};
