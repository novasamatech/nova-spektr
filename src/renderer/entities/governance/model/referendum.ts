import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, merge as mergeEvents, sample } from 'effector';
import { readonly, spread } from 'patronum';

import { type Chain, type ChainId, type Referendum } from '@/shared/core';
import { type ReferendumId } from '@/shared/pallet/referenda';
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
} = createSubscriber<RequestListParams, IteratorResult<Referendum[], void>>(({ api }, fn) => {
  return governanceSubscribeService.subscribeReferendums(api, fn);
});

const $referendums = createStore<Record<ChainId, Referendum[]>>({});
const $isLoading = createStore(true);

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
  clock: requestReferendumsFx.done,
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

sample({
  clock: received,
  source: $referendums,
  filter: (_, { params }) => nonNullable(params.chain),
  fn: (referendums, { params, result }) => {
    const existing = referendums[params.chain.chainId] ?? [];

    if (result.done) {
      return {
        isLoading: false,
        referendums,
      };
    }

    return {
      loading: true,
      referendums: {
        ...referendums,
        [params.chain.chainId]: mergeReferendums(existing, result.value),
      },
    };
  },
  target: spread({
    referendums: $referendums,
    isLoading: $isLoading,
  }),
});

// loading

sample({
  clock: [requestReferendum, requestReferendums, subscribeReferendums],
  fn: () => true,
  target: $isLoading,
});

sample({
  clock: [requestReferendumsFx.finally],
  fn: () => false,
  target: $isLoading,
});

const subscriptionReceivedReferendum = received.filterMap(({ params, result }) => {
  if (result.done) {
    return;
  }

  return {
    params,
    result: result.value,
  };
});

export const referendumModel = {
  $referendums: readonly($referendums),
  $isLoading: readonly($isLoading),

  events: {
    subscribeReferendums,
    unsubscribeReferendums,
    requestReferendums,
    requestReferendum,
    referendumsReceived: mergeEvents([requestReferendumsFx.done, subscriptionReceivedReferendum]),
  },
};
