import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import noop from 'lodash/noop';
import { readonly } from 'patronum';

import { type Address, type TrackId, type VotingMap } from '@/shared/core';
import { governanceService } from '../lib/governanceService';

const votingSet = createEvent<VotingMap>();

const $voting = restore<VotingMap>(votingSet, {});
const $votingUnsub = createStore<() => void>(noop);

type VotingParams = {
  api: ApiPromise;
  tracks: TrackId[];
  addresses: Address[];
};

const requestVoting = createEvent<VotingParams>();

const subscribeVotingFx = createEffect(({ api, tracks, addresses }: VotingParams) => {
  const boundVotingSet = scopeBind(votingSet, { safe: true });

  return governanceService.getVotingFor(api, tracks, addresses, (voting) => {
    if (!voting) return;

    boundVotingSet(voting);
  });
});

sample({
  clock: requestVoting,
  target: subscribeVotingFx,
});

sample({
  clock: subscribeVotingFx.doneData,
  target: $votingUnsub,
});

export const votingModel = {
  $voting: readonly($voting),
  $isLoading: subscribeVotingFx.pending,
  $votingUnsub,

  effects: {
    requestVotingFx: subscribeVotingFx,
  },

  events: {
    requestVoting,
  },
};
