import type { ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { governanceService } from '@/shared/api/governance';
import type { Chain, ChainId, Referendum } from '@/shared/core';

const $referendums = createStore<Record<ChainId, Referendum[]>>({});

type RequestParams = {
  chain: Chain;
  api: ApiPromise;
};

const requestReferendums = createEvent<RequestParams>();

const requestReferendumsFx = createEffect(({ api }: RequestParams) => {
  return governanceService.getReferendums(api);
});

sample({
  clock: requestReferendums,
  target: requestReferendumsFx,
});

sample({
  clock: requestReferendumsFx.done,
  source: $referendums,
  fn: (referendums, { params, result }) => {
    return params.chain ? { ...referendums, [params.chain.chainId]: result } : referendums;
  },
  target: $referendums,
});

export const referendumModel = {
  $referendums: readonly($referendums),
  $isReferendumsLoading: requestReferendumsFx.pending,

  effects: {
    requestReferendumsFx,
  },

  events: {
    requestReferendums,
    requestDone: requestReferendumsFx.done,
  },
};
