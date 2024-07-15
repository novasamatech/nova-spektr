import { createStore, createEffect, createEvent, sample } from 'effector';
import { readonly } from 'patronum';

import { Chain, ChainId, ReferendumId } from '@shared/core';
import { GovernanceApi, ReferendumVote } from '@shared/api/governance';
import { governanceModel } from './governanceApi';

const $voteHistory = createStore<Record<ChainId, ReferendumVote[]>>({});

const requestVoteHistory = createEvent<{ chain: Chain; referendumId: ReferendumId }>();

type RequestVoteHistoryParams = {
  service: GovernanceApi;
  chain: Chain;
  referendumId: ReferendumId;
};

const requestVoteHistoryFx = createEffect(({ chain, referendumId, service }: RequestVoteHistoryParams) => {
  return service.getReferendumVotes;
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
    return { ...history, [params.chain.chainId]: result };
  },
  target: $voteHistory,
});

export const voteHistoryModel = {
  $voteHistory: readonly($voteHistory),

  events: {
    requestVoteHistory,
  },
};
