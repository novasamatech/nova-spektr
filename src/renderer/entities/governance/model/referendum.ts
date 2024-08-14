import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Chain, type ChainId, type Referendum, type ReferendumId } from '@/shared/core';
import { addUnique } from '@shared/lib/utils';
import { governanceService } from '../lib/governanceService';

const $referendums = createStore<Record<ChainId, Referendum[]>>({});

type RequestListParams = {
  chain: Chain;
  api: ApiPromise;
};

type RequestRecordParams = {
  chain: Chain;
  api: ApiPromise;
  referendumId: ReferendumId;
};

const requestReferendums = createEvent<RequestListParams>();
const requestReferendum = createEvent<RequestRecordParams>();

const requestReferendumsFx = createEffect(({ api }: RequestListParams) => {
  return governanceService.getReferendums(api);
});

const requestReferendumFx = createEffect(({ api, referendumId }: RequestRecordParams) => {
  return governanceService.getReferendum(referendumId, api);
});

sample({
  clock: requestReferendums,
  target: requestReferendumsFx,
});

sample({
  clock: requestReferendum,
  target: requestReferendumFx,
});

sample({
  clock: requestReferendumsFx.done,
  source: $referendums,
  fn: (referendums, { params, result }) => {
    return params.chain ? { ...referendums, [params.chain.chainId]: result } : referendums;
  },
  target: $referendums,
});

sample({
  clock: requestReferendumFx.done,
  source: $referendums,
  fn: (referendums, { params, result }) => {
    if (!result) return referendums;

    const referendumsInChain = referendums[params.chain.chainId] ?? [];
    const resultReferendums = addUnique(referendumsInChain, result, (x) => x.referendumId);

    return { ...referendums, [params.chain.chainId]: resultReferendums };
  },
  target: $referendums,
});

export const referendumModel = {
  $referendums: readonly($referendums),
  $isReferendumsLoading: requestReferendumsFx.pending,

  events: {
    requestReferendums,
    requestReferendum,
    requestDone: requestReferendumsFx.done,
  },
};
