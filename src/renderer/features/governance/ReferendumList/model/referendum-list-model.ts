import { createStore, createEffect, sample, combine } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { spread, or, and, not, previous, inFlight } from 'patronum';
import isEmpty from 'lodash/isEmpty';
import { BN_ZERO, BN } from '@polkadot/util';

import { networkModel, networkUtils } from '@entities/network';
import { governanceModel, referendumUtils } from '@entities/governance';
import { getCurrentBlockNumber } from '@shared/lib/utils';
import { createChunksEffect, referendumListUtils } from '../lib/referendum-list-utils';
import { walletModel } from '@entities/wallet';
import { IGovernanceApi, governanceService, opengovThresholdService } from '@shared/api/governance';
import {
  ChainId,
  ReferendumId,
  OngoingReferendum,
  TrackInfo,
  TrackId,
  VotingThreshold,
  Address,
  Voting,
  Chain,
} from '@shared/core';
import { networkSelectorModel } from '@features/governance';

const $referendumsRequested = createStore<boolean>(false);
const $referendumsTitles = createStore<Record<ChainId, Record<ReferendumId, string>>>({});

const $currentReferendumTitles = combine(
  {
    titles: $referendumsTitles,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ titles, chain }) => (chain ? titles[chain.chainId] ?? {} : {}),
);

const $isConnectionActive = combine(
  {
    chain: networkSelectorModel.$governanceChain,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    if (!chain) {
      return false;
    }

    const connectionStatus = statuses[chain.chainId];
    if (!connectionStatus) {
      return false;
    }

    return networkUtils.isConnectingStatus(connectionStatus) || networkUtils.isConnectedStatus(connectionStatus);
  },
);

type RequestChainParams = {
  chain: Chain;
  api: ApiPromise;
};

const requestOnChainReferendumsFx = createEffect(({ api }: RequestChainParams) => {
  return governanceService.getReferendums(api);
});

type OffChainParams = {
  chain: Chain;
  service: IGovernanceApi;
};

type OffChainReceiveParams = {
  chainId: ChainId;
  data: Record<string, string>;
};

const { request: requestOffChainReferendums, receive: receiveOffChainReferendums } = createChunksEffect<
  OffChainParams,
  OffChainReceiveParams
>(({ chain, service }, cb) => {
  return service.getReferendumList(chain, (data) => {
    cb({ chainId: chain.chainId, data });
  });
});

type RequestTracksParams = {
  api: ApiPromise;
  chain: Chain;
};

const requestTracksFx = createEffect(({ api }: RequestTracksParams): Record<TrackId, TrackInfo> => {
  return governanceService.getTracks(api);
});

type VotingParams = {
  api: ApiPromise;
  tracksIds: TrackId[];
  addresses: Address[];
};
const requestVotingFx = createEffect(
  ({ api, tracksIds, addresses }: VotingParams): Promise<Record<TrackId, Record<TrackId, Voting>>> => {
    return governanceService.getVotingFor(api, tracksIds, addresses);
  },
);

type ThresholdParams = {
  api: ApiPromise;
  referendums: OngoingReferendum[];
  tracks: Record<TrackId, TrackInfo>;
};
const getApproveThresholdsFx = createEffect(
  async ({ api, referendums, tracks }: ThresholdParams): Promise<Record<ReferendumId, VotingThreshold>> => {
    const blockNumber = await getCurrentBlockNumber(api);

    const result: Record<ReferendumId, VotingThreshold> = {};

    for (const referendum of referendums) {
      result[referendum.referendumId] = opengovThresholdService.ayesFractionThreshold({
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

    for (const referendum of referendums) {
      result[referendum.referendumId] = opengovThresholdService.supportThreshold({
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

sample({
  clock: networkSelectorModel.events.chainChanged,
  source: previous(networkSelectorModel.$governanceChain),
  filter: (oldChain, newChain) => oldChain?.chainId !== newChain.chainId,
  target: $referendumsRequested.reinit,
});

sample({
  clock: networkSelectorModel.$governanceChainApi,
  source: {
    requested: $referendumsRequested,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ requested }, api) => !requested && Boolean(api),
  fn: ({ chain }, api) => ({ api: api!, chain: chain! }),
  target: [requestTracksFx, requestOnChainReferendumsFx],
});

sample({
  clock: networkSelectorModel.$governanceChainApi,
  source: {
    chain: networkSelectorModel.$governanceChain,
    governanceApi: governanceModel.$governanceApi,
    referendumsRequested: $referendumsRequested,
  },
  filter: ({ referendumsRequested, chain, governanceApi }, referendums) => {
    return !referendumsRequested && Boolean(chain) && !isEmpty(referendums) && Boolean(governanceApi);
  },
  fn: ({ chain, governanceApi }) => ({
    chain: chain!,
    service: governanceApi!.service,
  }),
  target: requestOffChainReferendums,
});

sample({
  clock: requestTracksFx.doneData,
  target: governanceModel.$tracks,
});

sample({
  clock: requestTracksFx.doneData,
  source: {
    api: networkSelectorModel.$governanceChainApi,
    chain: networkSelectorModel.$governanceChain,
    wallet: walletModel.$activeWallet,
  },
  filter: ({ api, chain, wallet }) => !!api && !!chain && !!wallet,
  fn: ({ api, chain, wallet }, tracks) => {
    return {
      api: api!,
      tracksIds: Object.keys(tracks),
      addresses: referendumListUtils.getAddressesForWallet(wallet!, chain!),
    };
  },
  target: requestVotingFx,
});

sample({
  clock: walletModel.$activeWallet,
  source: {
    api: networkSelectorModel.$governanceChainApi,
    chain: networkSelectorModel.$governanceChain,
    tracks: governanceModel.$tracks,
  },
  filter: ({ api, chain }, wallet) => !!api && !!chain && !!wallet,
  fn: ({ api, chain, tracks }, wallet) => {
    return {
      api: api!,
      tracksIds: Object.keys(tracks),
      addresses: referendumListUtils.getAddressesForWallet(wallet!, chain!),
    };
  },
  target: requestVotingFx,
});

sample({
  clock: requestVotingFx.doneData,
  target: governanceModel.$voting,
});

sample({
  clock: requestOnChainReferendumsFx.done,
  source: {
    referendums: governanceModel.$referendums,
    chain: networkSelectorModel.$governanceChain,
  },
  fn: ({ chain, referendums }, { params, result }) => {
    if (!chain) {
      return referendums;
    }

    const resultReferendums = { ...referendums, [chain.chainId]: result };

    return {
      referendums: resultReferendums,
      requested: true,
    };
  },
  target: spread({
    referendums: governanceModel.$referendums,
    requested: $referendumsRequested,
  }),
});

sample({
  clock: requestOnChainReferendumsFx.done,
  source: {
    api: networkSelectorModel.$governanceChainApi,
    tracks: governanceModel.$tracks,
    referendums: governanceModel.$referendums,
  },
  fn: ({ api, tracks, referendums }, { params }) => ({
    api: api!,
    referendums: (referendums[params.chain.chainId] ?? []).filter(referendumUtils.isOngoing),
    tracks,
  }),
  target: [getApproveThresholdsFx, getSupportThresholdsFx],
});

sample({
  clock: getApproveThresholdsFx.doneData,
  source: {
    chain: networkSelectorModel.$governanceChain,
    thresholds: governanceModel.$approvalThresholds,
  },
  filter: ({ chain }) => !!chain,
  fn: ({ chain, thresholds }, data) => ({
    ...thresholds,
    [chain!.chainId]: data,
  }),
  target: governanceModel.$approvalThresholds,
});

sample({
  clock: getSupportThresholdsFx.doneData,
  source: {
    chain: networkSelectorModel.$governanceChain,
    thresholds: governanceModel.$supportThresholds,
  },
  filter: ({ chain }) => !!chain,
  fn: ({ chain, thresholds }, data) => ({
    ...thresholds,
    [chain!.chainId]: data,
  }),
  target: governanceModel.$supportThresholds,
});

sample({
  clock: receiveOffChainReferendums,
  source: $referendumsTitles,
  fn: (referendumsDetails, { chainId, data }) => {
    const { [chainId]: chainToUpdate, ...rest } = referendumsDetails;

    return { ...rest, [chainId]: { ...chainToUpdate, ...data } };
  },
  target: $referendumsTitles,
});

export const referendumListModel = {
  $referendumsTitles,
  $currentReferendumTitles,
  $chain: networkSelectorModel.$governanceChain,
  $isApiActive: networkSelectorModel.$isApiConnected,
  $isLoading: or(
    and($isConnectionActive, not($referendumsRequested)),
    inFlight([requestOnChainReferendumsFx, getApproveThresholdsFx, getSupportThresholdsFx, requestVotingFx]),
  ),

  input: {
    chainChanged: networkSelectorModel.events.chainChanged,
  },
};
