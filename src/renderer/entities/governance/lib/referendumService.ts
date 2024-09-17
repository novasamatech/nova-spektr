import {
  type ApprovedReferendum,
  type CompletedReferendum,
  type KilledReferendum,
  type OngoingReferendum,
  type Referendum,
  type RejectedReferendum,
  type TimedOutReferendum,
} from '@/shared/core';

export const referendumService = {
  isOngoing,
  isRejected,
  isApproved,
  isCompleted,
  isTimedOut,
  isKilled,

  getOperationStatus,
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
function getOperationStatus(referendum: OngoingReferendum) {
  if (!referendum.decisionDeposit) return 'no_deposit';

  if (referendum.deciding) return 'no_deposit';

  return 'deciding';
}
