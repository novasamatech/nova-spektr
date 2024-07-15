import { createEffect, createEvent, createStore, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { readonly } from 'patronum';

import { Address, TrackId, type VotingMap } from '@shared/core';
import { governanceService } from '@shared/api/governance';

const $voting = createStore<VotingMap>({});

type VotingParams = {
  api: ApiPromise;
  tracksIds: TrackId[];
  addresses: Address[];
};

const requestVoting = createEvent<VotingParams>();

const requestVotingFx = createEffect(({ api, tracksIds, addresses }: VotingParams): Promise<VotingMap> => {
  return governanceService.getVotingFor(api, tracksIds, addresses);
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

  effects: {
    requestVotingFx,
  },

  events: {
    requestVoting,
  },
};
