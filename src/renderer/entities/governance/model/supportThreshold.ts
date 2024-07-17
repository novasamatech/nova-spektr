import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { createEffect, createEvent, createStore, sample } from 'effector';

import { opengovThresholdService } from '@/shared/api/governance';
import {
  type Chain,
  type ChainId,
  type OngoingReferendum,
  type ReferendumId,
  type TrackId,
  type TrackInfo,
  type VotingThreshold,
} from '@/shared/core';
import { getCurrentBlockNumber } from '@/shared/lib/utils';

import { referendumService } from '@/entities/governance';

import { referendumModel } from './referendum';
import { tracksModel } from './tracks';

const $supportThresholds = createStore<Record<ChainId, Record<ReferendumId, VotingThreshold>>>({});

type SupportThresholdParams = {
  api: ApiPromise;
  chain: Chain;
  referendums: OngoingReferendum[];
  tracks: Record<TrackId, TrackInfo>;
};

const requestSupportThresholds = createEvent<SupportThresholdParams>();

const requestSupportThresholdsFx = createEffect(
  async ({ api, referendums, tracks }: SupportThresholdParams): Promise<Record<ReferendumId, VotingThreshold>> => {
    const [blockNumber, totalIssuance, inactiveIssuance] = await Promise.all([
      getCurrentBlockNumber(api),
      api.query.balances.totalIssuance(),
      api.query.balances.inactiveIssuance(),
    ]);

    const result: Record<ReferendumId, VotingThreshold> = {};

    for (const referendum of referendums) {
      const track = tracks[referendum.track];
      if (!track) {
        continue;
      }

      result[referendum.referendumId] = opengovThresholdService.supportThreshold({
        supportCurve: tracks[referendum.track].minSupport,
        tally: referendum.tally,
        totalIssuance: totalIssuance.toBn().sub(inactiveIssuance.toBn()),
        blockDifference: referendum.deciding?.since ? blockNumber - referendum.deciding.since : 0,
        decisionPeriod: new BN(track.decisionPeriod),
      });
    }

    return result;
  },
);

sample({
  clock: requestSupportThresholds,
  target: requestSupportThresholdsFx,
});

sample({
  clock: referendumModel.events.requestDone,
  source: {
    tracks: tracksModel.$tracks,
  },
  fn: ({ tracks }, { params, result: referendums }) => ({
    api: params.api,
    chain: params.chain,
    referendums: referendums.filter(referendumService.isOngoing),
    tracks,
  }),
  target: requestSupportThresholdsFx,
});

sample({
  clock: requestSupportThresholdsFx.done,
  source: $supportThresholds,
  fn: (thresholds, { params, result }) => ({
    ...thresholds,
    [params.chain.chainId]: result,
  }),
  target: $supportThresholds,
});

export const supportThresholdModel = {
  $supportThresholds,
  $isSupportThresholdsLoading: requestSupportThresholdsFx.pending,

  effects: {
    requestSupportThresholdsFx,
  },

  events: {
    requestSupportThresholds,
  },
};
