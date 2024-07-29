import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type GovernanceApi, type ReferendumVote } from '@/shared/api/governance';
import { type Chain, type ChainId, type ReferendumId } from '@/shared/core';
import { setNestedValue } from '@/shared/lib/utils';

import { governanceModel } from './governanceApi';

const $voteHistory = createStore<Record<ChainId, Record<ReferendumId, ReferendumVote[]>>>({});

const requestVoteHistory = createEvent<{ chain: Chain; referendumId: ReferendumId }>();

type RequestVoteHistoryParams = {
  service: GovernanceApi;
  chain: Chain;
  referendumId: ReferendumId;
};

const requestVoteHistoryFx = createEffect(({ chain, referendumId, service }: RequestVoteHistoryParams) => {
  return service.getReferendumVotes(chain, referendumId, () => {});
});

sample({
  clock: requestVoteHistory,
  source: {
    service: governanceModel.$governanceApi,
  },
  filter: ({ service }) => !!service,
  fn: ({ service }, { chain, referendumId }) => ({
    chain,
    referendumId,
    service: service!.service,
  }),
  target: requestVoteHistoryFx,
});

sample({
  clock: requestVoteHistoryFx.done,
  source: $voteHistory,
  fn: (history, { params, result }) => {
    return setNestedValue(history, params.chain.chainId, params.referendumId, result);
  },
  target: $voteHistory,
});

export const voteHistoryModel = {
  $voteHistory: readonly($voteHistory),
  $voteHistoryLoading: requestVoteHistoryFx.pending,

  events: {
    requestVoteHistory,
    voteHistoryRequestDone: requestVoteHistoryFx.done,
  },
};
