import { createStore, createEffect, sample, combine } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { spread, or, and, not, previous, inFlight } from 'patronum';
import isEmpty from 'lodash/isEmpty';
import { BN_ZERO, BN } from '@polkadot/util';

import { networkModel, networkUtils } from '@entities/network';
import { referendumUtils, governanceModel } from '@entities/governance';
import { getCurrentBlockNumber, toAddress } from '@shared/lib/utils';
import { createChunksEffect, referendumListUtils } from '../lib/referendum-list-utils';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { IGovernanceApi, governanceService, opengovThresholdService } from '@shared/api/governance';
import {
  ReferendumInfo,
  ChainId,
  ReferendumId,
  OngoingReferendum,
  CompletedReferendum,
  TrackInfo,
  TrackId,
  VotingThreshold,
  Address,
  Voting,
  Chain,
} from '@shared/core';
import { networkSelectorModel } from '@features/governance';

// const namesReceived = createEvent<{ chainId: ChainId; data: Record<string, string> }>();

const $referendumsNames = createStore<Record<ChainId, Record<ReferendumId, string>>>({});
const $referendumsRequested = createStore<boolean>(false);

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

const requestOnChainReferendumsFx = createEffect(
  ({ api }: RequestChainParams): Promise<Record<ReferendumId, ReferendumInfo>> => {
    return governanceService.getReferendums(api);
  },
);

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
>(({ chain, service }, cb) => service.getReferendumList(chain, (data) => cb({ chainId: chain.chainId, data })));

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
  referendums: Record<ReferendumId, OngoingReferendum>;
  tracks: Record<TrackId, TrackInfo>;
};
const getApproveThresholdsFx = createEffect(
  async ({ api, referendums, tracks }: ThresholdParams): Promise<Record<ReferendumId, VotingThreshold>> => {
    const blockNumber = await getCurrentBlockNumber(api);

    const result: Record<ReferendumId, VotingThreshold> = {};

    for (const [index, referendum] of Object.entries(referendums)) {
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

    for (const [index, referendum] of Object.entries(referendums)) {
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

sample({
  clock: networkSelectorModel.events.chainChanged,
  source: previous(networkSelectorModel.$governanceChain),
  filter: (oldChain, newChain) => oldChain?.chainId !== newChain.chainId,
  target: [
    $referendumsRequested.reinit,
    governanceModel.$ongoingReferendums.reinit,
    governanceModel.$completedReferendums.reinit,
    governanceModel.$tracks.reinit,
    governanceModel.$approvalThresholds.reinit,
    governanceModel.$supportThresholds.reinit,
    governanceModel.$voting.reinit,
  ],
});

sample({
  clock: networkSelectorModel.$governanceChainApi.updates,
  source: {
    requested: $referendumsRequested,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ requested }, api) => !requested && Boolean(api),
  fn: ({ chain }, api) => ({ api: api!, chain: chain! }),
  target: [requestTracksFx, requestOnChainReferendumsFx],
});

sample({
  clock: networkSelectorModel.$governanceChainApi.updates,
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
    requested: $referendumsRequested,
  },
  filter: ({ api, chain, wallet, requested }) => {
    return Boolean(chain) && Boolean(wallet) && !requested && Boolean(api);
  },
  fn: ({ api, chain, wallet }, tracks) => {
    // TODO: uncomment when governance page is ready
    const matchedAccounts = walletUtils.getAccountsBy([wallet!], (account) => {
      return accountUtils.isChainIdMatch(account, chain!.chainId);
    });
    const addresses = matchedAccounts.map((a) => toAddress(a.accountId, { prefix: chain!.addressPrefix }));

    return { api: api!, tracksIds: Object.keys(tracks), addresses };
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
    ongoingReferendums: governanceModel.$ongoingReferendums,
    completedReferendums: governanceModel.$completedReferendums,
  },
  fn: ({ ongoingReferendums, completedReferendums }, { params, result: referendums }) => {
    const ongoing: Record<ReferendumId, OngoingReferendum> = {};
    const completed: Record<ReferendumId, CompletedReferendum> = {};

    for (const [index, referendum] of Object.entries(referendums)) {
      if (referendumUtils.isCompleted(referendum)) {
        completed[index] = referendum;
      }
      if (referendumUtils.isOngoing(referendum)) {
        ongoing[index] = referendum;
      }
    }

    const chainId = params.chain.chainId;

    return {
      ongoing: {
        ...ongoingReferendums,
        [chainId]: referendumListUtils.getSortedOngoing(ongoing),
      },
      completed: {
        ...completedReferendums,
        [chainId]: referendumListUtils.getSortedCompleted(completed),
      },
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
  clock: requestOnChainReferendumsFx.done,
  source: {
    api: networkSelectorModel.$governanceChainApi,
    tracks: governanceModel.$tracks,
    referendums: governanceModel.$ongoingReferendums,
  },
  fn: ({ api, tracks, referendums }, { params }) => ({
    api: api!,
    referendums: referendums[params.chain.chainId] ?? {},
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

sample({
  clock: receiveOffChainReferendums,
  source: $referendumsNames,
  fn: (referendumsDetails, { chainId, data }) => {
    const { [chainId]: chainToUpdate, ...rest } = referendumsDetails;

    return { ...rest, [chainId]: { ...chainToUpdate, ...data } };
  },
  target: $referendumsNames,
});

export const referendumListModel = {
  $referendumsNames,
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
