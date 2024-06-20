import { createStore, createEvent, createEffect, restore, sample, combine, scopeBind } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { spread, or, and, not, previous } from 'patronum';
import isEmpty from 'lodash/isEmpty';
import { BN_ZERO, BN } from '@polkadot/util';

import { networkModel, networkUtils } from '@entities/network';
import { referendumUtils, governanceModel } from '@entities/governance';
import { getCurrentBlockNumber } from '@shared/lib/utils';
import { referendumListUtils } from '../lib/referendum-list-utils';
import { walletModel } from '@entities/wallet';
import {
  IGovernanceApi,
  governanceService,
  polkassemblyService,
  opengovThresholdService,
} from '@shared/api/governance';
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

const chainChanged = createEvent<Chain>();
const governanceApiChanged = createEvent<IGovernanceApi>();
const detailsReceived = createEvent<{ chainId: ChainId; data: Record<string, string> }>();

const $chain = restore(chainChanged, null);
const $governanceApi = restore(governanceApiChanged, polkassemblyService);

const $referendumsDetails = createStore<Record<ChainId, Record<ReferendumId, string>>>({});
const $referendumsRequested = createStore<boolean>(false);

const $isConnectionActive = combine(
  {
    chain: $chain,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    if (!chain) return false;

    return (
      networkUtils.isConnectingStatus(statuses[chain.chainId]) ||
      networkUtils.isConnectedStatus(statuses[chain.chainId])
    );
  },
);

const requestOnChainReferendumsFx = createEffect((api: ApiPromise): Promise<Map<ReferendumId, ReferendumInfo>> => {
  return governanceService.getReferendums(api);
});

type OffChainParams = {
  chainId: ChainId;
  service: IGovernanceApi;
};
const requestOffChainReferendumsFx = createEffect(({ chainId, service }: OffChainParams) => {
  const boundUpdateDetails = scopeBind(detailsReceived, { safe: true });

  service.getReferendumList(chainId, (data) => {
    boundUpdateDetails({ chainId, data });
  });
});

const requestTracksFx = createEffect((api: ApiPromise): Record<TrackId, TrackInfo> => {
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
    chain: $chain,
    apis: networkModel.$apis,
  },
  ({ chain, apis }) => {
    if (!chain) return null;

    return apis[chain.chainId] || null;
  },
);

sample({
  clock: chainChanged,
  source: previous($chain),
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
  clock: $api.updates,
  source: $referendumsRequested,
  filter: (referendumsRequested, api) => !referendumsRequested && Boolean(api),
  fn: (_, api) => api!,
  target: [requestTracksFx, requestOnChainReferendumsFx],
});

sample({
  clock: $api.updates,
  source: {
    chain: $chain,
    service: $governanceApi,
    referendumsRequested: $referendumsRequested,
  },
  filter: ({ referendumsRequested, chain, service }, referendums) => {
    return !referendumsRequested && Boolean(chain) && !isEmpty(referendums) && Boolean(service);
  },
  fn: ({ chain, service }) => ({
    chainId: chain!.chainId,
    service: service!,
  }),
  target: requestOffChainReferendumsFx,
});

sample({
  clock: requestTracksFx.doneData,
  target: governanceModel.$tracks,
});

sample({
  clock: requestTracksFx.doneData,
  source: {
    api: $api,
    chain: $chain,
    wallet: walletModel.$activeWallet,
    requested: $referendumsRequested,
  },
  filter: ({ api, chain, wallet, requested }) => {
    return Boolean(chain) && Boolean(wallet) && !requested && Boolean(api);
  },
  fn: ({ api, chain, wallet }, tracks) => {
    // TODO: uncomment when governance page is ready
    // const matchedAccounts = walletUtils.getAccountsBy([wallet!], (account) => {
    //   return accountUtils.isChainIdMatch(account, chain!.chainId);
    // });
    // const addresses = matchedAccounts.map((a) => toAddress(a.accountId, { prefix: chain!.addressPrefix }));
    const addresses = [
      '12mP4sjCfKbDyMRAEyLpkeHeoYtS5USY4x34n9NMwQrcEyoh',
      '15x643ScnbVQM3zGcyRw3qVtaCoddmAfDv5LZVfU8fNxkVaR',
    ];

    return { api: api!, tracksIds: Object.keys(tracks), addresses };
  },
  target: requestVotingFx,
});

sample({
  clock: requestVotingFx.doneData,
  target: governanceModel.$voting,
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

sample({
  clock: detailsReceived,
  source: $referendumsDetails,
  fn: (referendumsDetails, { chainId, data }) => {
    const { [chainId]: chainToUpdate, ...rest } = referendumsDetails;

    return { ...rest, [chainId]: { ...chainToUpdate, ...data } };
  },
  target: $referendumsDetails,
});

export const referendumListModel = {
  $chain,
  $referendumsDetails,
  $isApiActive: $api.map((api) => api?.isConnected),
  $isLoading: or(
    and($isConnectionActive, not($referendumsRequested)),
    requestOnChainReferendumsFx.pending,
    getApproveThresholdsFx.pending,
    getSupportThresholdsFx.pending,
    requestVotingFx.pending,
  ),

  input: {
    chainChanged,
    governanceApiChanged,
  },
};
