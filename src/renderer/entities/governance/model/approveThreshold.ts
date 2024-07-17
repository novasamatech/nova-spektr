import { createEffect, createEvent, createStore, sample } from 'effector';
import { BN, BN_ZERO } from '@polkadot/util';
import { type ApiPromise } from '@polkadot/api';
import { readonly } from 'patronum';

import type {
  Chain,
  ChainId,
  OngoingReferendum,
  ReferendumId,
  TrackId,
  TrackInfo,
  VotingThreshold,
} from '@/shared/core';
import { getCurrentBlockNumber } from '@/shared/lib/utils';
import { opengovThresholdService } from '@/shared/api/governance';

import { referendumService } from '@/entities/governance';

import { tracksModel } from './tracks';
import { referendumModel } from './referendum';

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
  source: tracksModel.$tracks,
  fn: (tracks, { params, result: referendums }) => ({
    api: params.api,
    chain: params.chain,
    referendums: referendums.filter(referendumService.isOngoing),
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
  $approvalThresholds: readonly($approvalThresholds),
  $getApproveThresholdsPending: requestApproveThresholdsFx.pending,
  effects: {
    requestApproveThresholdsFx,
  },
  events: {
    requestApproveThresholds,
  },
};
