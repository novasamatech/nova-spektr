import { ReferendumType, CompletedReferendum } from '@shared/core';
import type { ReferendumInfo, OngoingReferendum, RejectedReferendum, ApprovedReferendum } from '@shared/core';

export const referendumService = {
  isOngoing,
  isRejected,
  isApproved,
  isCompleted,

  getOperationStatus,
};

function isOngoing(referendum: ReferendumInfo): referendum is OngoingReferendum {
  return referendum.type === ReferendumType.Ongoing;
}

function isRejected(referendum: ReferendumInfo): referendum is RejectedReferendum {
  return referendum.type === ReferendumType.Rejected;
}

function isApproved(referendum: ReferendumInfo): referendum is ApprovedReferendum {
  return referendum.type === ReferendumType.Approved;
}

function isCompleted(referendum: ReferendumInfo): referendum is CompletedReferendum {
  return referendum.type !== ReferendumType.Ongoing;
}

// waiting for deposit, deciding, passing
function getOperationStatus(referendum: OngoingReferendum): string {
  if (!referendum.decisionDeposit) return 'no_deposit';

  if (referendum.deciding) return 'no_deposit';

  return 'deciding';
}
