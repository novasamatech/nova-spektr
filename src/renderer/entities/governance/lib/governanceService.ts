import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';

import {
  type Address,
  type Referendum,
  type ReferendumId,
  type TrackId,
  type TrackInfo,
  type VotingCurve,
} from '@/shared/core';
import {
  type ReferendaCurve,
  type ReferendaReferendumInfoConvictionVotingTally,
  referendaPallet,
} from '@/shared/pallet/referenda';
import { convictionVotingPallet } from '@shared/pallet/convictionVoting';

export const governanceService = {
  getReferendums,
  getTrackLocks,
  getTracks,
  mapReferendum,
};

function mapReferendum(referendumId: string, info: ReferendaReferendumInfoConvictionVotingTally): Referendum {
  switch (info.type) {
    case 'Ongoing':
      if (!('support' in info.data.tally)) {
        throw new Error('Tally is incorrect');
      }

      return {
        referendumId,
        type: info.type,
        track: info.data.track.toString(),
        proposal: info.data.proposal.data,
        submitted: info.data.submitted,
        enactment: {
          value: info.data.enactment.data,
          type: info.data.enactment.type,
        },
        inQueue: info.data.inQueue,
        deciding: info.data.deciding,
        tally: info.data.tally,
        decisionDeposit: info.data.decisionDeposit,
        submissionDeposit: info.data.submissionDeposit,
      };
    case 'Approved':
    case 'Rejected':
    case 'Cancelled':
    case 'TimedOut':
      return {
        type: info.type,
        referendumId,
        since: info.data.since,
        submissionDeposit: info.data.submissionDeposit,
        decisionDeposit: info.data.decisionDeposit,
      };
    case 'Killed':
      return {
        type: info.type,
        referendumId,
        since: info.data,
      };
  }
}

async function getReferendums(api: ApiPromise, ids?: ReferendumId[]): Promise<Referendum[]> {
  const referendums = await referendaPallet.storage.referendumInfoFor('governance', api, ids);
  const result: Referendum[] = [];

  for (const { id, info } of referendums) {
    if (!info) continue;

    result.push(mapReferendum(id.toString(), info));
  }

  return result;
}

async function getTrackLocks(api: ApiPromise, addresses: Address[]): Promise<Record<Address, Record<TrackId, BN>>> {
  const tuples = await convictionVotingPallet.storage.classLocksFor(api, addresses);
  const result: Record<Address, Record<TrackId, BN>> = {};

  for (const [index, locks] of tuples.entries()) {
    const lockData = locks.reduce<Record<TrackId, BN>>((acc, lock) => {
      acc[lock.track] = lock.amount;

      return acc;
    }, {});

    result[addresses[index]] = lockData;
  }

  return result;
}

function getTracks(api: ApiPromise): Record<TrackId, TrackInfo> {
  const tracks = referendaPallet.consts.tracks('governance', api);

  const result: Record<TrackId, TrackInfo> = {};

  for (const { track, info } of tracks) {
    const minApproval = mapCurve(info.minApproval);
    const minSupport = mapCurve(info.minSupport);

    result[track.toString()] = {
      name: info.name,
      maxDeciding: info.maxDeciding,
      decisionDeposit: info.decisionDeposit,
      preparePeriod: info.preparePeriod,
      decisionPeriod: info.decisionPeriod,
      minApproval,
      minSupport,
    };
  }

  return result;
}

const mapCurve = (value: ReferendaCurve): VotingCurve => {
  switch (value.type) {
    case 'LinearDecreasing':
      return {
        type: 'LinearDecreasing',
        length: value.data.length,
        floor: value.data.floor,
        ceil: value.data.ceil,
      };
    case 'SteppedDecreasing':
      return {
        type: 'SteppedDecreasing',
        begin: value.data.begin,
        end: value.data.end,
        period: value.data.period,
        step: value.data.step,
      };
    case 'Reciprocal':
      return {
        type: 'Reciprocal',
        factor: value.data.factor,
        xOffset: value.data.xOffset,
        yOffset: value.data.yOffset,
      };
  }
};
