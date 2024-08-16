import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { delegationService } from '@shared/api/governance';
import { type Address, type Chain, type ChainId, type ReferendumId } from '@shared/core';

const $delegatedVotes = createStore<Record<ChainId, Record<ReferendumId, Address>>>({});

type RequestParams = {
  addresses: Address[];
  chain: Chain;
};

const requestDelegatedVotes = createEvent<RequestParams>();

const getVotesFx = createEffect(({ addresses, chain }: RequestParams) => {
  return delegationService.getDelegatedVotesFromExternalSource(chain, addresses);
});

sample({
  clock: requestDelegatedVotes,
  target: getVotesFx,
});

sample({
  clock: getVotesFx.done,
  source: $delegatedVotes,
  fn: (votes, { params, result }) => {
    return { ...votes, [params.chain.chainId]: result };
  },
  target: $delegatedVotes,
});

export const delegatedVotesModel = {
  $delegatedVotes: readonly($delegatedVotes),

  events: {
    requestDelegatedVotes,
    requestDelegatedVotesDone: getVotesFx.done,
  },
};
