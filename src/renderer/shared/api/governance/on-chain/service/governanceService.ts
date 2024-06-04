import { ApiPromise } from '@polkadot/api';
import { BN_ZERO, BN } from '@polkadot/util';
import { PalletReferendaCurve } from '@polkadot/types/lookup';

import { ReferendumType, VoteType, TrackId, CastingVoting, VotingType } from '@shared/core';
import type {
  OngoingReferendum,
  RejectedReferendum,
  ApprovedReferendum,
  Address,
  StandardVote,
  SplitVote,
  SplitAbstainVote,
  TrackInfo,
  Voting,
  AccountVote,
  ReferendumId,
  ReferendumInfo,
  DelegatingVoting,
  CancelledReferendum,
  TimedOutReferendum,
  KilledReferendum,
  LinearDecreasingCurve,
  VotingCurve,
  SteppedDecreasingCurve,
  ReciprocalCurve,
} from '@shared/core';

export const governanceService = {
  getReferendums,
  getVotingFor,
  getTrackLocks,
  getTracks,
};

async function getReferendums(api: ApiPromise): Promise<Map<ReferendumId, ReferendumInfo>> {
  const referendums = await api.query.referenda.referendumInfoFor.entries();

  const result: Map<ReferendumId, ReferendumInfo> = new Map();

  for (const [refIndex, option] of referendums) {
    if (option.isNone) continue;

    const referendum = option.unwrap();

    if (referendum.isOngoing) {
      const ongoing = referendum.asOngoing;

      result.set(refIndex.args[0].toString(), {
        track: ongoing.track.toString(),
        submitted: ongoing.submitted.toNumber(),
        enactment: {
          value: ongoing.enactment.isAfter ? ongoing.enactment.asAfter.toBn() : ongoing.enactment.asAt.toBn(),
          type: ongoing.enactment.type,
        },
        inQueue: ongoing.inQueue.toPrimitive(),
        deciding: ongoing.deciding.isSome
          ? {
              since: ongoing.deciding.unwrap().since.toNumber(),
              confirming: ongoing.deciding.unwrap().confirming.unwrapOr(BN_ZERO).toNumber(),
            }
          : null,
        tally: {
          ayes: ongoing.tally.ayes.toBn(),
          nays: ongoing.tally.nays.toBn(),
          support: ongoing.tally.support.toBn(),
        },
        decisionDeposit: ongoing.decisionDeposit.isSome
          ? {
              who: ongoing.decisionDeposit.unwrap().who.toString(),
              amount: ongoing.decisionDeposit.unwrap().amount.toBn(),
            }
          : null,
        submissionDeposit: {
          who: ongoing.submissionDeposit.who.toString(),
          amount: ongoing.submissionDeposit.amount.toBn(),
        },
        type: ReferendumType.Ongoing,
      } as OngoingReferendum);
    }

    if (referendum.isRejected) {
      const rejected = referendum.asRejected;

      result.set(refIndex.args[0].toString(), {
        since: rejected[0].toNumber(),
        type: ReferendumType.Rejected,
      } as RejectedReferendum);
    }

    if (referendum.isApproved) {
      const approved = referendum.asApproved;

      result.set(refIndex.args[0].toString(), {
        since: approved[0].toNumber(),
        type: ReferendumType.Approved,
      } as ApprovedReferendum);
    }

    if (referendum.isCancelled) {
      const cancelled = referendum.asCancelled;

      result.set(refIndex.args[0].toString(), {
        since: cancelled[0].toNumber(),
        type: ReferendumType.Cancelled,
      } as CancelledReferendum);
    }

    if (referendum.isTimedOut) {
      const timedOut = referendum.asTimedOut;

      result.set(refIndex.args[0].toString(), {
        since: timedOut[0].toNumber(),
        type: ReferendumType.TimedOut,
      } as TimedOutReferendum);
    }

    if (referendum.isKilled) {
      result.set(refIndex.args[0].toString(), {
        since: referendum.asKilled.toNumber(),
        type: ReferendumType.Killed,
      } as KilledReferendum);
    }
  }

  return result;
}

async function getVotingFor(api: ApiPromise, address: Address): Promise<Record<TrackId, Voting>> {
  const votingEntries = await api.query.convictionVoting.votingFor.entries(address);

  const result: Record<TrackId, Voting> = {};
  for (const [misc, convictionVoting] of votingEntries) {
    if (convictionVoting.isDelegating) {
      const delegation = convictionVoting.asDelegating;

      result[misc[1].toString()] = {
        type: VotingType.DELEGATING,
        delegating: {
          balance: delegation.balance.toBn(),
          conviction: delegation.conviction.type,
          target: delegation.target.toString(),
          prior: {
            unlockAt: convictionVoting.asCasting.prior[0].toNumber(),
            amount: convictionVoting.asCasting.prior[0].toBn(),
          },
        },
      } as DelegatingVoting;
    }

    if (convictionVoting.isCasting) {
      const votes: Record<ReferendumId, AccountVote> = {};
      for (const [referendumIndex, vote] of convictionVoting.asCasting.votes) {
        if (vote.isStandard) {
          const standardVote = vote.asStandard;
          votes[referendumIndex.toString()] = {
            type: VoteType.Standard,
            vote: {
              type: standardVote.vote.isAye ? 'aye' : 'nay',
              conviction: standardVote.vote.conviction.type,
            },
            balance: standardVote.balance.toBn(),
          } as StandardVote;
        }

        if (vote.isSplit) {
          const splitVote = vote.asSplit;
          votes[referendumIndex.toString()] = {
            type: VoteType.Split,
            aye: splitVote.aye.toBn(),
            nay: splitVote.nay.toBn(),
          } as SplitVote;
        }

        if (vote.isSplitAbstain) {
          const splitAbstainVote = vote.asSplitAbstain;
          votes[referendumIndex.toString()] = {
            type: VoteType.SplitAbstain,
            aye: splitAbstainVote.aye.toBn(),
            nay: splitAbstainVote.nay.toBn(),
            abstain: splitAbstainVote.abstain.toBn(),
          } as SplitAbstainVote;
        }
      }

      result[misc[1].toString()] = {
        type: VotingType.CASTING,
        casting: {
          votes,
          prior: {
            unlockAt: convictionVoting.asCasting.prior[0].toNumber(),
            amount: convictionVoting.asCasting.prior[0].toBn(),
          },
        },
      } as CastingVoting;
    }
  }

  return result;
}

async function getTrackLocks(api: ApiPromise, address: Address): Promise<Record<TrackId, BN>> {
  const locks = await api.query.convictionVoting.classLocksFor(address);

  return locks.reduce<Record<TrackId, BN>>((acc, lock) => {
    acc[lock[0].toString()] = lock[1].toBn();

    return acc;
  }, {});
}

function getTracks(api: ApiPromise): Record<TrackId, TrackInfo> {
  const tracks = api.consts.referenda.tracks;

  const result: Record<TrackId, TrackInfo> = {};

  for (const [index, track] of tracks) {
    let minApproval = {} as VotingCurve;
    let minSupport = {} as VotingCurve;

    if (track.minApproval.isLinearDecreasing) minApproval = getLinearDecreasing(track.minApproval);
    if (track.minSupport.isLinearDecreasing) minSupport = getLinearDecreasing(track.minSupport);

    if (track.minApproval.isSteppedDecreasing) minApproval = getSteppedDecreasing(track.minApproval);
    if (track.minSupport.isSteppedDecreasing) minSupport = getSteppedDecreasing(track.minSupport);

    if (track.minApproval.isReciprocal) minApproval = getReciprocal(track.minApproval);
    if (track.minSupport.isReciprocal) minSupport = getReciprocal(track.minSupport);

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
