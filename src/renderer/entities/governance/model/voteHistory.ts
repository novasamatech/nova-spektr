import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type SubQueryVoting, votingsService } from '@/shared/api/governance';
import { type Chain, type ChainId, type Referendum, type ReferendumId } from '@/shared/core';
import { setNestedValue } from '@/shared/lib/utils';

const $voteHistory = createStore<Partial<Record<ChainId, Record<ReferendumId, SubQueryVoting[]>>>>({});
const $hasError = createStore(false);

const requestVoteHistory = createEvent<{ chain: Chain; referendum: Referendum }>();

type RequestVoteHistoryParams = {
  chain: Chain;
  referendum: Referendum;
};

const requestVoteHistoryFx = createEffect(({ chain, referendum }: RequestVoteHistoryParams) => {
  return votingsService.getVotingsForReferendum(chain, referendum.referendumId);
});

sample({
  clock: requestVoteHistory,
  target: requestVoteHistoryFx,
});

sample({
  clock: requestVoteHistory,
  fn: () => false,
  target: $hasError,
});

sample({
  clock: requestVoteHistoryFx.done,
  source: $voteHistory,
  fn: (history, { params, result }) => {
    return setNestedValue(history, params.chain.chainId, params.referendum.referendumId, result);
  },
  target: $voteHistory,
});

sample({
  clock: requestVoteHistoryFx.fail,
  fn: () => true,
  target: $hasError,
});

export const voteHistoryModel = {
  $voteHistory: readonly($voteHistory),
  $isLoading: requestVoteHistoryFx.pending,
  $hasError,

  events: {
    requestVoteHistory,
    voteHistoryRequestDone: requestVoteHistoryFx.done,
  },
};
