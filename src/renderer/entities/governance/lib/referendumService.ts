import {
  type ApprovedReferendum,
  type CompletedReferendum,
  type OngoingReferendum,
  type Referendum,
  ReferendumType,
  type RejectedReferendum,
  type TimedOutReferendum,
} from '@/shared/core';

export const referendumService = {
  isOngoing,
  isRejected,
  isApproved,
  isCompleted,
  isTimedOut,

  getOperationStatus,
};

function isOngoing(referendum: Referendum): referendum is OngoingReferendum {
  return referendum.type === ReferendumType.Ongoing;
}

function isRejected(referendum: Referendum): referendum is RejectedReferendum {
  return referendum.type === ReferendumType.Rejected;
}

function isApproved(referendum: Referendum): referendum is ApprovedReferendum {
  return referendum.type === ReferendumType.Approved;
}

function isCompleted(referendum: Referendum): referendum is CompletedReferendum {
  return referendum.type !== ReferendumType.Ongoing;
}

function isTimedOut(referendum: Referendum): referendum is TimedOutReferendum {
  return referendum.type === ReferendumType.TimedOut;
}

// waiting for deposit, deciding, passing
function getOperationStatus(referendum: OngoingReferendum) {
  if (!referendum.decisionDeposit) return 'no_deposit';

  if (referendum.deciding) return 'no_deposit';

  return 'deciding';
}
