import { type TrackId } from '@/shared/pallet/referenda';
import { trackService } from '../tracks/service';

import {
  type ApprovedReferendum,
  type CompletedReferendum,
  type EvidenceProposal,
  type KilledReferendum,
  type OngoingReferendum,
  type Proposal,
  type Referendum,
  type RejectedReferendum,
  type RfcProposal,
  type SpendProposal,
  type TimedOutReferendum,
  type UnknownProposal,
  type WhitelistProposal,
} from './types';

const isOngoing = (referendum: Referendum): referendum is OngoingReferendum => referendum.type === 'Ongoing';
const isRejected = (referendum: Referendum): referendum is RejectedReferendum => referendum.type === 'Rejected';
const isApproved = (referendum: Referendum): referendum is ApprovedReferendum => referendum.type === 'Approved';
const isTimedOut = (referendum: Referendum): referendum is TimedOutReferendum => referendum.type === 'TimedOut';
const isKilled = (referendum: Referendum): referendum is KilledReferendum => referendum.type === 'Killed';
const isCompleted = (referendum: Referendum): referendum is CompletedReferendum => referendum.type !== 'Ongoing';

const getOngoingReferendums = (referendums: Referendum[]) => referendums.filter(isOngoing);
const getCompletedReferendums = (referendums: Referendum[]) => referendums.filter(isCompleted);

const isEvidenceProposal = (proposal: Proposal): proposal is EvidenceProposal => proposal.type === 'Evidence';
const isRfcProposal = (proposal: Proposal): proposal is RfcProposal => proposal.type === 'Rfc';
const isUnknownProposal = (proposal: Proposal): proposal is UnknownProposal => proposal.type === 'Unknown';
const isWhitelistProposal = (proposal: Proposal): proposal is WhitelistProposal => proposal.type === 'Whitelist';
const isSpendProposal = (proposal: Proposal): proposal is SpendProposal => proposal.type === 'Spend';

function isReferendumInTrack(selectedTrackIds: TrackId[], referendum: Referendum) {
  if (selectedTrackIds.length === 0) {
    return true;
  }

  if (!isOngoing(referendum)) {
    return false;
  }

  return selectedTrackIds.includes(referendum.track);
}

// waiting for deposit, deciding, passing
function getOperationStatus(referendum: OngoingReferendum) {
  if (!referendum.decisionDeposit) return 'no_deposit';

  if (referendum.deciding) return 'no_deposit';

  return 'deciding';
}

function getProposer(referendum: Referendum) {
  if (isKilled(referendum)) return null;

  if (isOngoing(referendum) && referendum.proposal?.type === 'Evidence') {
    return referendum.proposal.accountId;
  }

  return referendum.submissionDeposit?.who ?? null;
}

function getRankForReferendum(referendum: OngoingReferendum): number | null {
  if (referendum.proposal?.type === 'Evidence' && referendum.proposal.rank != null) {
    return referendum.proposal.rank;
  }
  const rank = trackService.getRankFromTrackId(referendum.track);
  return rank > 0 ? rank : null;
}

export const referendumService = {
  isOngoing,
  isRejected,
  isApproved,
  isCompleted,
  isTimedOut,
  isKilled,

  isEvidenceProposal,
  isRfcProposal,
  isUnknownProposal,
  isWhitelistProposal,
  isSpendProposal,

  isReferendumInTrack,

  getOngoingReferendums,
  getCompletedReferendums,
  getOperationStatus,
  getProposer,
  getRankForReferendum,
};
