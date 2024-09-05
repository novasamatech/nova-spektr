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
import { type ReferendaCurve, referendaPallet } from '@/shared/pallet/referenda';
import { convictionVotingPallet } from '@shared/pallet/convictionVoting';

export const governanceService = {
  getReferendums,
  getTrackLocks,
  getTracks,
};

async function getReferendums(api: ApiPromise, ids?: ReferendumId[]): Promise<Referendum[]> {
  const referendums = await referendaPallet.storage.referendumInfoFor('governance', api, ids);
  const result: Referendum[] = [];

  for (const { id, info } of referendums) {
    if (!info) continue;

    const referendumId = id.toString();
    let mappedReferemdum: Referendum;

    switch (info.type) {
      case 'Ongoing':
        mappedReferemdum = {
          referendumId,
          type: info.type,
          track: info._.track.toString(),
          proposal: info._.proposal._,
          submitted: info._.submitted,
          enactment: {
            value: info._.enactment._,
            type: info._.enactment.type,
          },
          inQueue: info._.inQueue,
          deciding: info._.deciding,
          tally: info._.tally,
          decisionDeposit: info._.decisionDeposit,
          submissionDeposit: info._.submissionDeposit,
        };
        break;
      case 'Approved':
      case 'Rejected':
      case 'Cancelled':
      case 'TimedOut':
        mappedReferemdum = {
          type: info.type,
          referendumId,
          since: info._.since,
          submissionDeposit: info._.submissionDeposit,
          decisionDeposit: info._.decisionDeposit,
        };
        break;
      case 'Killed':
        mappedReferemdum = {
          type: info.type,
          referendumId,
          since: info._,
        };
        break;
    }

    result.push(mappedReferemdum);
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
        length: value._.length,
        floor: value._.floor,
        ceil: value._.ceil,
      };
    case 'SteppedDecreasing':
      return {
        type: 'SteppedDecreasing',
        begin: value._.begin,
        end: value._.end,
        period: value._.period,
        step: value._.step,
      };
    case 'Reciprocal':
      return {
        type: 'Reciprocal',
        factor: value._.factor,
        xOffset: value._.xOffset,
        yOffset: value._.yOffset,
      };
  }
};
