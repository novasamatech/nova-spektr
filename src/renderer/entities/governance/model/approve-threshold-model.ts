import { createEffect, createEvent, createStore, sample } from 'effector';
import { BN, BN_ZERO } from '@polkadot/util';
import { type ApiPromise } from '@polkadot/api';

import type {
  Chain,
  ChainId,
  OngoingReferendum,
  ReferendumId,
  TrackId,
  TrackInfo,
  VotingThreshold,
} from '@shared/core';
import { getCurrentBlockNumber } from '@shared/lib/utils';
import { opengovThresholdService } from '@shared/api/governance';
import { referendumUtils } from '@entities/governance';
import { tracksModel } from './tracks-model';
import { referendumModel } from './referendum-model';

const $approvalThresholds = createStore<Record<ChainId, Record<ReferendumId, VotingThreshold>>>({});

type ApproveThresholdParams = {
  api: ApiPromise;
  chain: Chain;
  referendums: OngoingReferendum[];
  tracks: Record<TrackId, TrackInfo>;
};

const requestApproveThresholds = createEvent<ApproveThresholdParams>();

const requestApproveThresholdsFx = createEffect(
  async ({ api, referendums, tracks }: ApproveThresholdParams): Promise<Record<ReferendumId, VotingThreshold>> => {
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

sample({
  clock: requestApproveThresholds,
  target: requestApproveThresholdsFx,
});

sample({
  clock: referendumModel.events.requestDone,
  source: {
    tracks: tracksModel.$tracks,
    referendums: referendumModel.$referendums,
  },
  fn: ({ tracks, referendums }, { params }) => ({
    api: params.api,
    chain: params.chain,
    referendums: (referendums[params.chain.chainId] ?? []).filter(referendumUtils.isOngoing),
    tracks,
  }),
  target: requestApproveThresholdsFx,
});

sample({
  clock: requestApproveThresholdsFx.done,
  source: $approvalThresholds,
  fn: (thresholds, { params, result }) => ({
    ...thresholds,
    [params.chain.chainId]: result,
  }),
  target: $approvalThresholds,
});

export const approveThresholdModel = {
  $approvalThresholds,
  $getApproveThresholdsPending: requestApproveThresholdsFx.pending,
  effects: {
    requestApproveThresholdsFx,
  },
  events: {
    requestApproveThresholds,
  },
};
