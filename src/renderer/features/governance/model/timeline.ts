import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type GovernanceApi, type ReferendumTimelineRecord } from '@shared/api/governance';
import { type Chain, type ChainId, type ReferendumId } from '@shared/core';
import { setNestedValue } from '@shared/lib/utils';
import { governanceModel } from '@entities/governance';

import { networkSelectorModel } from './networkSelector';

const $timelines = createStore<Record<ChainId, Record<ReferendumId, ReferendumTimelineRecord[]>>>({});

const $currentChainTimelines = combine($timelines, networkSelectorModel.$governanceChain, (timelines, chain) => {
  if (!chain) {
    return {};
  }

  return timelines[chain.chainId] ?? {};
});

const requestTimeline = createEvent<{ referendumId: ReferendumId }>();

type RequestTimelineParams = {
  service: GovernanceApi;
  chain: Chain;
  referendumId: ReferendumId;
};

const requestTimelineFx = createEffect<RequestTimelineParams, ReferendumTimelineRecord[]>(
  ({ service, chain, referendumId }) => {
    return service.getReferendumTimeline(chain, referendumId);
  },
);

sample({
  clock: requestTimeline,
  source: {
    chain: networkSelectorModel.$governanceChain,
    api: governanceModel.$governanceApi,
  },
  filter: ({ chain, api }) => !!chain && !!api,
  fn: ({ chain, api }, { referendumId }) => {
    return {
      service: api!.service,
      chain: chain!,
      referendumId,
    };
  },
  target: requestTimelineFx,
});

sample({
  clock: requestTimelineFx.done,
  source: $timelines,
  fn: (timelines, { params, result }) => {
    return setNestedValue(timelines, params.chain.chainId, params.referendumId, result);
  },
  target: $timelines,
});

export const timelineModel = {
  $timelines: readonly($timelines),
  $currentChainTimelines: readonly($currentChainTimelines),
  $isTimelineLoading: requestTimelineFx.pending,

  events: {
    requestTimeline,
  },
};
