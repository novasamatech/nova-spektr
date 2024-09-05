import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, merge as mergeEvents, sample } from 'effector';
import { readonly } from 'patronum';

import { type Chain, type ChainId, type Referendum, type ReferendumId } from '@/shared/core';
import { merge, nonNullable } from '@shared/lib/utils';
import { governanceService } from '../lib/governanceService';
import { governanceSubscribeService } from '../lib/governanceSubscribeService';
import { createSubscriber } from '../utils/createSubscriber';

const mergeReferendums = (a: Referendum[], b: Referendum[]) => {
  return merge(
    a,
    b,
    (x) => x.referendumId,
    (a, b) => parseInt(a.referendumId) - parseInt(b.referendumId),
  );
};

const {
  subscribe: subscribeReferendums,
  received,
  unsubscribe: unsubscribeReferendums,
} = createSubscriber<RequestListParams, Referendum[]>(({ api }, fn) => {
  return governanceSubscribeService.subscribeReferendums(api, fn);
});

const $referendums = createStore<Record<ChainId, Referendum[]>>({});

// referendum list

type RequestRecordParams = {
  chain: Chain;
  api: ApiPromise;
  referendumId: ReferendumId;
};

const requestReferendum = createEvent<RequestRecordParams>();

type RequestListParams = {
  chain: Chain;
  api: ApiPromise;
  ids?: ReferendumId[];
};

const requestReferendums = createEvent<RequestListParams>();

const requestReferendumsFx = createEffect(({ api, ids }: RequestListParams) => {
  return governanceService.getReferendums(api, ids);
});

sample({
  clock: requestReferendums,
  target: requestReferendumsFx,
});

sample({
  clock: requestReferendum,
  fn: ({ api, chain, referendumId }) => ({
    api,
    chain,
    ids: [referendumId],
  }),
  target: requestReferendumsFx,
});

sample({
  clock: [received, requestReferendumsFx.done],
  source: $referendums,
  filter: (_, { params }) => nonNullable(params.chain),
  fn: (referendums, { params, result }) => {
    const existing = referendums[params.chain.chainId] ?? [];

    return {
      ...referendums,
      [params.chain.chainId]: mergeReferendums(existing, result),
    };
  },
  target: $referendums,
});

// loading

const $isLoading = createStore(true);

sample({
  clock: [requestReferendum, requestReferendums, subscribeReferendums],
  fn: () => true,
  target: $isLoading,
});

sample({
  clock: [requestReferendumsFx.finally, received],
  fn: () => false,
  target: $isLoading,
});

export const referendumModel = {
  $referendums: readonly($referendums),
  $isLoading: readonly($isLoading),

  events: {
    subscribeReferendums,
    unsubscribeReferendums,
    requestReferendums,
    requestReferendum,
    referendumsReceived: mergeEvents([requestReferendumsFx.done, received]),
  },
};
