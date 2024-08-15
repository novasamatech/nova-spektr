import { type ApiPromise } from '@polkadot/api';
import {
  type FrameSupportPreimagesBounded,
  type PalletReferendaCurve,
  type PalletReferendaDeposit,
  type PalletReferendaReferendumInfoConvictionVotingTally,
} from '@polkadot/types/lookup';
import { type BN, BN_ZERO } from '@polkadot/util';

import {
  type Address,
  type Deposit,
  type LinearDecreasingCurve,
  type ReciprocalCurve,
  type Referendum,
  type ReferendumId,
  ReferendumType,
  type SteppedDecreasingCurve,
  type TrackId,
  type TrackInfo,
  type VotingCurve,
} from '@/shared/core';

export const governanceService = {
  getReferendums,
  getReferendum,
  getTrackLocks,
  getTracks,
};

function getProposalHex(proposal: FrameSupportPreimagesBounded) {
  if (proposal.isInline) {
    return proposal.asInline.toHex();
  }
  if (proposal.isLookup) {
    return proposal.asLookup.toHex();
  }
  if (proposal.isLegacy) {
    return proposal.asLegacy.toHex();
  }

  return '';
}

const mapDeposit = (deposit: PalletReferendaDeposit | null): Deposit | null => {
  if (!deposit) return null;

  return {
    who: deposit.who.toString(),
    amount: deposit.amount.toBn(),
  };
};

const mapReferendum = (
  referendumId: ReferendumId,
  palette: PalletReferendaReferendumInfoConvictionVotingTally,
): Referendum | null => {
  if (palette.isOngoing) {
    const ongoing = palette.asOngoing;
    const deciding = ongoing.deciding.unwrapOr(null);
    const decisionDeposit = ongoing.decisionDeposit.unwrapOr(null);
    const submissionDeposit = ongoing.submissionDeposit;
    const proposal = getProposalHex(ongoing.proposal);

    return {
      referendumId,
      type: ReferendumType.Ongoing,
      track: ongoing.track.toString(),
      proposal,
      submitted: ongoing.submitted.toNumber(),
      enactment: {
        value: ongoing.enactment.isAfter ? ongoing.enactment.asAfter.toBn() : ongoing.enactment.asAt.toBn(),
        type: ongoing.enactment.type,
      },
      inQueue: ongoing.inQueue.toPrimitive(),
      deciding: deciding
        ? {
            since: deciding.since.toNumber(),
            confirming: deciding.confirming.unwrapOr(BN_ZERO).toNumber(),
          }
        : null,
      tally: {
        ayes: ongoing.tally.ayes.toBn(),
        nays: ongoing.tally.nays.toBn(),
        support: ongoing.tally.support.toBn(),
      },
      decisionDeposit: mapDeposit(decisionDeposit),
      submissionDeposit: mapDeposit(submissionDeposit),
    };
  }

  if (palette.isRejected) {
    const referendum = palette.asRejected;
    const [since, submissionDeposit] = referendum;

    return {
      referendumId,
      type: ReferendumType.Rejected,
      since: since.toNumber(),
      submissionDeposit: mapDeposit(submissionDeposit.unwrapOr(null)),
    };
  }

  if (palette.isApproved) {
    const referendum = palette.asApproved;
    const [since, submissionDeposit] = referendum;

    return {
      referendumId,
      type: ReferendumType.Approved,
      since: since.toNumber(),
      submissionDeposit: mapDeposit(submissionDeposit.unwrapOr(null)),
    };
  }

  if (palette.isCancelled) {
    const referendum = palette.asCancelled;
    const [since, submissionDeposit] = referendum;

    return {
      referendumId,
      type: ReferendumType.Cancelled,
      since: since.toNumber(),
      submissionDeposit: mapDeposit(submissionDeposit.unwrapOr(null)),
    };
  }

  if (palette.isTimedOut) {
    const referendum = palette.asTimedOut;
    const [since, submissionDeposit] = referendum;

    return {
      referendumId,
      type: ReferendumType.TimedOut,
      since: since.toNumber(),
      submissionDeposit: mapDeposit(submissionDeposit.unwrapOr(null)),
    };
  }

  if (palette.isKilled) {
    return {
      referendumId,
      type: ReferendumType.Killed,
      since: palette.asKilled.toNumber(),
    };
  }

  return null;
};

async function getReferendums(api: ApiPromise): Promise<Referendum[]> {
  const referendums = await api.query.referenda.referendumInfoFor.entries();

  const result: Referendum[] = [];

  for (const [refIndex, option] of referendums) {
    if (option.isNone) continue;

    const pallet = option.unwrap();
    const referendumId = refIndex.args[0].toString();
    const referendum = mapReferendum(referendumId, pallet);

    if (referendum) {
      result.push(referendum);
    }
  }

  return result;
}

async function getReferendum(id: ReferendumId, api: ApiPromise): Promise<Referendum | null> {
  const palette = await api.query.referenda.referendumInfoFor(parseInt(id));

  if (palette.isNone) {
    return null;
  }

  return mapReferendum(id, palette.unwrap());
}

async function getTrackLocks(api: ApiPromise, addresses: Address[]): Promise<Record<Address, Record<TrackId, BN>>> {
  const tuples = await api.query.convictionVoting.classLocksFor.multi(addresses);
  const result: Record<Address, Record<TrackId, BN>> = {};

  for (const [index, locks] of tuples.entries()) {
    const lockData = locks.reduce<Record<TrackId, BN>>((acc, lock) => {
      acc[lock[0].toString()] = lock[1].toBn();

      return acc;
    }, {});

    result[addresses[index]] = lockData;
  }

  return result;
}

function getTracks(api: ApiPromise): Record<TrackId, TrackInfo> {
  const tracks = api.consts.referenda.tracks;

  const result: Record<TrackId, TrackInfo> = {};

  for (const [index, track] of tracks) {
    let minApproval: VotingCurve | undefined;
    let minSupport: VotingCurve | undefined;

    if (track.minApproval.isLinearDecreasing) minApproval = getLinearDecreasing(track.minApproval);
    if (track.minSupport.isLinearDecreasing) minSupport = getLinearDecreasing(track.minSupport);

    if (track.minApproval.isSteppedDecreasing) minApproval = getSteppedDecreasing(track.minApproval);
    if (track.minSupport.isSteppedDecreasing) minSupport = getSteppedDecreasing(track.minSupport);

    if (track.minApproval.isReciprocal) minApproval = getReciprocal(track.minApproval);
    if (track.minSupport.isReciprocal) minSupport = getReciprocal(track.minSupport);

    if (!minApproval || !minSupport) {
      throw new Error('Approval curve not found');
    }

    result[index.toString()] = {
      name: track.name.toString(),
      maxDeciding: track.maxDeciding.toBn(),
      decisionDeposit: track.decisionDeposit.toBn(),
      preparePeriod: track.preparePeriod.toNumber(),
      decisionPeriod: track.decisionPeriod.toNumber(),
      minApproval,
      minSupport,
    };
  }

  return result;
}

function getLinearDecreasing(approval: PalletReferendaCurve): LinearDecreasingCurve {
  const linearDecreasing = approval.asLinearDecreasing;

  return {
    type: 'LinearDecreasing',
    length: linearDecreasing.length,
    floor: linearDecreasing.floor,
    ceil: linearDecreasing.ceil,
  };
}

function getSteppedDecreasing(approval: PalletReferendaCurve): SteppedDecreasingCurve {
  const steppedDecreasing = approval.asSteppedDecreasing;

  return {
    type: 'SteppedDecreasing',
    begin: steppedDecreasing.begin,
    end: steppedDecreasing.end,
    period: steppedDecreasing.period,
    step: steppedDecreasing.step,
  };
}

function getReciprocal(approval: PalletReferendaCurve): ReciprocalCurve {
  const reciprocal = approval.asReciprocal;

  return {
    type: 'Reciprocal',
    factor: reciprocal.factor,
    xOffset: reciprocal.xOffset,
    yOffset: reciprocal.yOffset,
  };
}
