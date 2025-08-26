import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type DelegateInfo, delegationService } from '@/shared/api/governance';
import { type Chain, type ChainId, type ReferendumId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

const $delegatedVotes = createStore<Record<ChainId, Record<ReferendumId, DelegateInfo[]>>>({});

type RequestParams = {
  accounts: AccountId[];
  chain: Chain;
};

const requestDelegatedVotes = createEvent<RequestParams>();

const getVotesFx = createEffect(({ accounts, chain }: RequestParams) => {
  return delegationService.getDelegatedVotesFromExternalSource(chain, accounts);
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
