import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import {
  type GovernanceApi,
  type ReferendumTimelineRecord,
  type ReferendumTimelineRecordStatus,
} from '@shared/api/governance';
import {
  type Chain,
  type ChainId,
  type CompletedReferendum,
  type Referendum,
  type ReferendumId,
  ReferendumType,
} from '@shared/core';
import { getCreatedDateFromApi, nonNullable, setNestedValue } from '@shared/lib/utils';
import { governanceModel, referendumService } from '@entities/governance';

import { networkSelectorModel } from './networkSelector';

const mapReferendumToTimelineStatus = (referendum: CompletedReferendum): ReferendumTimelineRecordStatus => {
  switch (referendum.type) {
    case ReferendumType.Killed:
      return 'Killed';
    case ReferendumType.Cancelled:
      return 'Cancelled';
    case ReferendumType.Rejected:
      return 'Rejected';
    case ReferendumType.Approved:
      return 'Approved';
    case ReferendumType.TimedOut:
      return 'TimedOut';
  }
};

const $timelines = createStore<Record<ChainId, Record<ReferendumId, ReferendumTimelineRecord[]>>>({});

const $currentChainTimelines = combine($timelines, networkSelectorModel.$governanceChain, (timelines, chain) => {
  if (!chain) {
    return {};
  }

  return timelines[chain.chainId] ?? {};
});

const requestTimeline = createEvent<{ referendum: Referendum }>();

// off chain

type RequestOffTimelineParams = {
  service: GovernanceApi;
  chain: Chain;
  referendum: Referendum;
};

const requestOffChainTimelineFx = createEffect<RequestOffTimelineParams, ReferendumTimelineRecord[]>(
  ({ service, chain, referendum }) => service.getReferendumTimeline(chain, referendum.referendumId),
);

sample({
  clock: requestTimeline,
  source: {
    chain: networkSelectorModel.$governanceChain,
    api: governanceModel.$governanceApi,
  },
  filter: ({ chain, api }, { referendum }) =>
    nonNullable(chain) && nonNullable(api) && referendumService.isOngoing(referendum),
  fn: ({ chain, api }, { referendum }) => ({
    service: api!.service,
    chain: chain!,
    referendum,
  }),
  target: requestOffChainTimelineFx,
});

// on chain

type RequestOnTimelineParams = {
  api: ApiPromise;
  chain: Chain;
  referendum: CompletedReferendum;
};

const requestOnChainTimelineFx = createEffect<RequestOnTimelineParams, ReferendumTimelineRecord[]>(
  ({ api, referendum }) =>
    getCreatedDateFromApi(referendum.since, api).then((time) => [
      { date: new Date(time), status: mapReferendumToTimelineStatus(referendum) },
    ]),
);

sample({
  clock: requestTimeline,
  source: {
    chain: networkSelectorModel.$governanceChain,
    api: networkSelectorModel.$governanceChainApi,
  },
  filter: ({ api, chain }, { referendum }) =>
    nonNullable(api) &&
    nonNullable(chain) &&
    referendumService.isCompleted(referendum) &&
    !referendumService.isKilled(referendum),
  fn: ({ api, chain }, { referendum }) => ({
    api: api!,
    chain: chain!,
    referendum: referendum as CompletedReferendum,
  }),
  target: requestOnChainTimelineFx,
});

// sample result

sample({
  clock: [requestOnChainTimelineFx.done, requestOffChainTimelineFx.done],
  source: $timelines,
  fn: (timelines, { params, result }) =>
    setNestedValue(timelines, params.chain.chainId, params.referendum.referendumId, result),
  target: $timelines,
});

export const timelineModel = {
  $timelines: readonly($timelines),
  $currentChainTimelines: readonly($currentChainTimelines),
  $isLoading: requestOffChainTimelineFx.pending,

  events: {
    requestTimeline,
  },
};
