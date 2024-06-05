import { createStore, createEvent, createEffect, restore, sample, combine } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { spread, or, and, not } from 'patronum';
import isEmpty from 'lodash/isEmpty';
import { BN_ZERO, BN } from '@polkadot/util';

import { networkModel, networkUtils } from '@entities/network';
import { referendumUtils, governanceModel } from '@entities/governance';
import { getCurrentBlockNumber } from '@shared/lib/utils';
import { referendumListUtils } from '../lib/referendum-list-utils';
import {
  ReferendumInfo,
  ChainId,
  ReferendumId,
  OngoingReferendum,
  CompletedReferendum,
  TrackInfo,
  TrackId,
  VotingThreshold,
} from '@shared/core';
import {
  IGovernanceApi,
  governanceService,
  polkassemblyService,
  opengovThresholdService,
} from '@shared/api/governance';

const chainIdChanged = createEvent<ChainId>();
const governanceApiChanged = createEvent<IGovernanceApi>();

const $chainId = restore(chainIdChanged, null);
const $governanceApi = restore(governanceApiChanged, polkassemblyService);

const $referendumsDetails = createStore<Record<ReferendumId, string>>({});
const $referendumsRequested = createStore<boolean>(false);

const $isConnectionActive = combine(
  {
    chainId: $chainId,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chainId, statuses }) => {
    if (!chainId) return false;

    return networkUtils.isConnectingStatus(statuses[chainId]) || networkUtils.isConnectedStatus(statuses[chainId]);
  },
);

const requestOnChainReferendumsFx = createEffect((api: ApiPromise): Promise<Map<ReferendumId, ReferendumInfo>> => {
  return governanceService.getReferendums(api);
});

type OffChainParams = {
  chainId: ChainId;
  service: IGovernanceApi;
};
const requestOffChainReferendumsFx = createEffect(
  ({ chainId, service }: OffChainParams): Promise<Record<string, string>> => {
    return Promise.resolve({});
    // return service.getReferendumList(chainId);
  },
);

const requestTracksFx = createEffect((api: ApiPromise): Record<TrackId, TrackInfo> => {
  return governanceService.getTracks(api);
});

// const requestVotingFx = createEffect((api: ApiPromise): Record<TrackId, TrackInfo> => {
//   return governanceService.getVotingFor(api, TEST_ADDRESS);
// });

type ThresholdParams = {
  api: ApiPromise;
  referendums: Map<ReferendumId, OngoingReferendum>;
  tracks: Record<TrackId, TrackInfo>;
};
const getApproveThresholdsFx = createEffect(
  async ({ api, referendums, tracks }: ThresholdParams): Promise<Record<ReferendumId, VotingThreshold>> => {
    const blockNumber = await getCurrentBlockNumber(api);

    const result: Record<ReferendumId, VotingThreshold> = {};

    for (const [index, referendum] of referendums.entries()) {
      result[index] = opengovThresholdService.ayesFractionThreshold({
        approvalCurve: tracks[referendum.track].minApproval,
        tally: referendum.tally,
        totalIssuance: BN_ZERO, // not used in calculation
        blockDifference: referendum.deciding?.since ? blockNumber - referendum.deciding.since : 0,
        decisionPeriod: new BN(tracks[referendum.track].decisionPeriod),
      });
    }

    return result;
  },
);

const getSupportThresholdsFx = createEffect(
  async ({ api, referendums, tracks }: ThresholdParams): Promise<Record<ReferendumId, VotingThreshold>> => {
    const blockNumber = await getCurrentBlockNumber(api);
    const totalIssuance = await api.query.balances.totalIssuance();
    const inactiveIssuance = await api.query.balances.inactiveIssuance();

    const result: Record<ReferendumId, VotingThreshold> = {};

    for (const [index, referendum] of referendums.entries()) {
      result[index] = opengovThresholdService.supportThreshold({
        supportCurve: tracks[referendum.track].minSupport,
        tally: referendum.tally,
        totalIssuance: totalIssuance.toBn().sub(inactiveIssuance.toBn()),
        blockDifference: referendum.deciding?.since ? blockNumber - referendum.deciding.since : 0,
        decisionPeriod: new BN(tracks[referendum.track].decisionPeriod),
      });
    }

    return result;
  },
);

const $api = combine(
  {
    chainId: $chainId,
    apis: networkModel.$apis,
  },
  ({ chainId, apis }) => {
    return (chainId && apis[chainId]) || null;
  },
);

const $isApiActive = combine($api, (api) => {
  return Boolean(api?.isConnected);
});

sample({
  clock: chainIdChanged,
  source: $chainId,
  filter: (oldChainId, newChainId) => oldChainId !== newChainId,
  target: $referendumsRequested.reinit,
});

sample({
  clock: $api.updates,
  fn: (api) => api!,
  target: requestTracksFx,
});

sample({
  clock: $api.updates,
  source: $referendumsRequested,
  filter: (referendumsRequested, api) => !referendumsRequested && Boolean(api),
  fn: (_, api) => api!,
  target: [requestTracksFx, requestOnChainReferendumsFx],
});

sample({
  clock: requestTracksFx.doneData,
  target: governanceModel.$tracks,
});

sample({
  clock: requestOnChainReferendumsFx.doneData,
  fn: (referendums) => {
    const ongoing: Map<ReferendumId, OngoingReferendum> = new Map();
    const completed: Map<ReferendumId, CompletedReferendum> = new Map();

    for (const [index, referendum] of referendums) {
      if (referendumUtils.isCompleted(referendum)) {
        completed.set(index, referendum);
      }
      if (referendumUtils.isOngoing(referendum)) {
        ongoing.set(index, referendum);
      }
    }

    return {
      ongoing: referendumListUtils.getSortedOngoing(ongoing),
      completed: referendumListUtils.getSortedCompleted(completed),
      requested: true,
    };
  },
  target: spread({
    ongoing: governanceModel.$ongoingReferendums,
    completed: governanceModel.$completedReferendums,
    requested: $referendumsRequested,
  }),
});

sample({
  clock: requestOnChainReferendumsFx.doneData,
  source: {
    chainId: $chainId,
    service: $governanceApi,
  },
  filter: ({ chainId, service }, referendums) => {
    return Boolean(chainId) && !isEmpty(referendums) && Boolean(service);
  },
  fn: ({ chainId, service }) => {
    return { chainId: chainId!, service: service! };
  },
  target: requestOffChainReferendumsFx,
});

sample({
  clock: requestOffChainReferendumsFx.doneData,
  filter: (referendums) => !isEmpty(referendums),
  target: $referendumsDetails,
});

sample({
  clock: requestOnChainReferendumsFx.doneData,
  source: {
    api: $api,
    tracks: governanceModel.$tracks,
    referendums: governanceModel.$ongoingReferendums,
  },
  fn: ({ api, tracks, referendums }) => ({
    api: api!,
    referendums,
    tracks,
  }),
  target: [getApproveThresholdsFx, getSupportThresholdsFx],
});

sample({
  clock: getApproveThresholdsFx.doneData,
  target: governanceModel.$approvalThresholds,
});

sample({
  clock: getSupportThresholdsFx.doneData,
  target: governanceModel.$supportThresholds,
});

export const referendumListModel = {
  $referendumsDetails,
  $isApiActive,
  $isLoading: or(
    and($isConnectionActive, not($referendumsRequested)),
    requestOnChainReferendumsFx.pending,
    getApproveThresholdsFx.pending,
    getSupportThresholdsFx.pending,
  ),

  events: {
    chainIdChanged,
    governanceApiChanged,
  },
};
