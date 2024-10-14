import {
  type ApprovedReferendum,
  type BlockHeight,
  type CompletedReferendum,
  type KilledReferendum,
  type OngoingReferendum,
  type Referendum,
  type ReferendumStatus,
  type RejectedReferendum,
  type TimedOutReferendum,
  type TrackInfo,
} from '@/shared/core';

export const referendumService = {
  isOngoing,
  isRejected,
  isApproved,
  isCompleted,
  isTimedOut,
  isKilled,

  getReferendumStatus,
  getReferendumEndTime,
};

function isOngoing(referendum: Referendum): referendum is OngoingReferendum {
  return referendum.type === 'Ongoing';
}

function isRejected(referendum: Referendum): referendum is RejectedReferendum {
  return referendum.type === 'Rejected';
}

function isApproved(referendum: Referendum): referendum is ApprovedReferendum {
  return referendum.type === 'Approved';
}

function isCompleted(referendum: Referendum): referendum is CompletedReferendum {
  return referendum.type !== 'Ongoing';
}

function isTimedOut(referendum: Referendum): referendum is TimedOutReferendum {
  return referendum.type === 'TimedOut';
}

function isKilled(referendum: Referendum): referendum is KilledReferendum {
  return referendum.type === 'Killed';
}

// waiting for deposit, deciding, passing
function getReferendumStatus(referendum: OngoingReferendum): ReferendumStatus {
  if (!referendum.decisionDeposit) return 'NoDeposit';

  if (referendum.deciding?.confirming) return 'Passing';

  return 'Deciding';
}

function getReferendumEndTime(referendum: OngoingReferendum, track: TrackInfo, undecidingTimeout: number): BlockHeight {
  if (referendum.deciding?.confirming) return referendum.deciding.confirming;

  if (referendum.deciding) return referendum.deciding.since + track.decisionPeriod;

  return referendum.submitted + undecidingTimeout;
}
