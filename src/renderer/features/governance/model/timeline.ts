import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';
import { readonly } from 'patronum';

import { type GovernanceApi, type ReferendumTimelineRecord } from '@/shared/api/governance';
import { type Chain, type ChainId, type Referendum, type ReferendumId } from '@/shared/core';
import { getCreatedDateFromApi, nonNullable, pickNestedValue } from '@/shared/lib/utils';
import { referendumService } from '@/entities/governance';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

import { networkSelectorModel } from './networkSelector';

const $timelines = createStore<
  Record<ChainId, Record<ReferendumId, { onChain: ReferendumTimelineRecord[]; offChain: ReferendumTimelineRecord[] }>>
>({});

const $currentChainTimelines = combine(
  {
    timelines: $timelines,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ timelines, chainId }) => {
    if (!chainId) return {};

    return timelines[chainId] ?? {};
  },
);

const requestTimeline = createEvent<{ referendum: Referendum }>();

// off chain

type RequestOffTimelineParams = {
  service: GovernanceApi;
  chain: Chain;
  referendum: Referendum;
};

const requestOffChainTimelineFx = createEffect<RequestOffTimelineParams, ReferendumTimelineRecord[]>(
  ({ service, chain, referendum }) => {
    return service.getReferendumTimeline(chain, referendum.referendumId);
  },
);

sample({
  clock: requestTimeline,
  source: {
    chain: networkSelectorModel.$governanceChain,
    api: governanceMetaProvider.$metaProvider,
    timelines: $timelines,
  },
  filter: ({ chain, api, timelines }, { referendum }) =>
    nonNullable(chain) && nonNullable(api) && !pickNestedValue(timelines, chain.chainId, referendum.referendumId),
  fn: ({ chain, api }, { referendum }) => ({
    service: api!.service,
    chain: chain!,
    referendum,
  }),
  target: requestOffChainTimelineFx,
});

sample({
  clock: requestOffChainTimelineFx.done,
  source: $timelines,
  fn: (timelines, { params: { chain, referendum }, result }) => {
    return produce(timelines, (draft) => {
      let chainReferendums = draft[chain.chainId];
      if (!chainReferendums) {
        chainReferendums = {};
        draft[chain.chainId] = chainReferendums;
      }

      let referendumTimelines = chainReferendums[referendum.referendumId];
      if (!referendumTimelines) {
        referendumTimelines = { onChain: [], offChain: [] };
        chainReferendums[referendum.referendumId] = referendumTimelines;
      }

      referendumTimelines.offChain = result;
    });
  },
  target: $timelines,
});

// on chain

type RequestOnTimelineParams = {
  api: ApiPromise;
  chain: Chain;
  referendum: Referendum;
};

const requestOnChainTimelineFx = createEffect<RequestOnTimelineParams, ReferendumTimelineRecord[]>(
  ({ api, referendum }) => {
    if (!referendumService.isOngoing(referendum)) {
      return getCreatedDateFromApi(referendum.since, api).then((time) => [
        { date: new Date(time), status: referendum.type },
      ]);
    }

    const requests = Promise.all([
      getCreatedDateFromApi(referendum.submitted, api).then(
        (time): ReferendumTimelineRecord => ({
          date: new Date(time),
          status: 'Submitted',
        }),
      ),
      referendum.deciding
        ? getCreatedDateFromApi(referendum.deciding.since, api).then(
            (time): ReferendumTimelineRecord => ({
              date: new Date(time),
              status: 'Deciding',
            }),
          )
        : null,
    ]);

    return requests.then((list) => list.filter(nonNullable));
  },
);

sample({
  clock: requestTimeline,
  source: {
    network: networkSelectorModel.$network,
    timelines: $timelines,
  },
  filter: ({ network, timelines }, { referendum }) =>
    nonNullable(network) &&
    !pickNestedValue(timelines, network.chain.chainId, referendum.referendumId) &&
    !referendumService.isKilled(referendum),
  fn: ({ network }, { referendum }) => ({
    api: network!.api,
    chain: network!.chain,
    referendum,
  }),
  target: requestOnChainTimelineFx,
});

sample({
  clock: requestOnChainTimelineFx.done,
  source: $timelines,
  fn: (timelines, { params: { chain, referendum }, result }) => {
    return produce(timelines, (draft) => {
      let chainReferendums = draft[chain.chainId];
      if (!chainReferendums) {
        chainReferendums = {};
        draft[chain.chainId] = chainReferendums;
      }

      let referendumTimelines = chainReferendums[referendum.referendumId];
      if (!referendumTimelines) {
        referendumTimelines = { onChain: [], offChain: [] };
        chainReferendums[referendum.referendumId] = referendumTimelines;
      }

      referendumTimelines.onChain = result;
    });
  },
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
