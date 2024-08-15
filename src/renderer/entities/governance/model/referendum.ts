import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { interval, readonly } from 'patronum';

import { type Chain, type ChainId, type Referendum, type ReferendumId } from '@/shared/core';
import { addUnique } from '@shared/lib/utils';
import { governanceService } from '../lib/governanceService';

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
const updateReferendums = createEvent<RequestListParams>();
const stopUpdateReferendums = createEvent();

const $referendums = createStore<Record<ChainId, Referendum[]>>({});
const $network = createStore<RequestListParams | null>(null);
const $isReferendumsLoading = createStore(true);

const requestReferendumsFx = createEffect(({ api }: RequestListParams) => {
  return governanceService.getReferendums(api);
});

const requestReferendumFx = createEffect(({ api, referendumId }: RequestRecordParams) => {
  return governanceService.getReferendum(referendumId, api);
});

/* We can't subscribe to referendumInfoFor.entries(), so we refetch it every 30 seconds while the page is active to keep the data fresh. */
const { tick: requestReferendumsTriggered } = interval({
  start: updateReferendums,
  stop: stopUpdateReferendums,
  timeout: 30000,
  leading: true,
});

sample({
  clock: requestReferendums,
  target: requestReferendumsFx,
});

sample({
  clock: requestReferendumsFx,
  source: { referendums: $referendums, network: $network },
  filter: ({ network, referendums }) => !!network && referendums[network!.chain.chainId]?.length === 0,
  fn: () => Boolean(requestReferendumsFx.pending),
  target: $isReferendumsLoading,
});

sample({
  clock: updateReferendums,
  target: $network,
});

sample({
  clock: requestReferendumsTriggered,
  source: $network,
  filter: (network) => !!network,
  fn: (network) => ({
    api: network!.api,
    chain: network!.chain,
  }),
  target: requestReferendumsFx,
});

sample({
  clock: requestReferendum,
  target: requestReferendumFx,
});

sample({
  clock: requestReferendumsFx.done,
  source: $referendums,
  filter: (_, { params }) => !!params.chain,
  fn: (referendums, { params, result }) => {
    const updateArray = result ? result : referendums[params.chain.chainId];

    return { ...referendums, [params.chain.chainId]: updateArray };
  },
  target: $referendums,
});

sample({
  clock: requestReferendumsFx.finally,
  fn: () => false,
  target: $isReferendumsLoading,
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
  $isReferendumsLoading,

  events: {
    updateReferendums,
    stopUpdateReferendums,
    requestReferendums,
    requestReferendum,
    requestDone: requestReferendumsFx.done,
  },
};
