import { type TrackId } from '@/shared/pallet/referenda';

import {
  type ApprovedReferendum,
  type CompletedReferendum,
  type KilledReferendum,
  type OngoingReferendum,
  type Referendum,
  type RejectedReferendum,
  type TimedOutReferendum,
} from './types';

const isOngoing = (referendum: Referendum): referendum is OngoingReferendum => referendum.type === 'Ongoing';
const isRejected = (referendum: Referendum): referendum is RejectedReferendum => referendum.type === 'Rejected';
const isApproved = (referendum: Referendum): referendum is ApprovedReferendum => referendum.type === 'Approved';
const isTimedOut = (referendum: Referendum): referendum is TimedOutReferendum => referendum.type === 'TimedOut';
const isKilled = (referendum: Referendum): referendum is KilledReferendum => referendum.type === 'Killed';
const isCompleted = (referendum: Referendum): referendum is CompletedReferendum => referendum.type !== 'Ongoing';

const getOngoingReferendums = (referendums: Referendum[]) => referendums.filter(isOngoing);
const getCompletedReferendums = (referendums: Referendum[]) => referendums.filter(isCompleted);

const isReferendumInTrack = (selectedTrackIds: TrackId[], referendum: Referendum) => {
  if (selectedTrackIds.length === 0) {
    return true;
  }

  if (!isOngoing(referendum)) {
    return false;
  }

  return selectedTrackIds.includes(referendum.track);
};

// waiting for deposit, deciding, passing
const getOperationStatus = (referendum: OngoingReferendum) => {
  if (!referendum.decisionDeposit) return 'no_deposit';

  if (referendum.deciding) return 'no_deposit';

  return 'deciding';
};

export const referendumService = {
  isOngoing,
  isRejected,
  isApproved,
  isCompleted,
  isTimedOut,
  isKilled,

  isReferendumInTrack,

  getOngoingReferendums,
  getCompletedReferendums,
  getOperationStatus,
};
