import { ReferendumDetailsModal, additionalInfoSlot, referendumActionsSlot } from './components/ReferendumDetailsModal';
import { ReferendumTrackInfo } from './components/shared/ReferendumTrackInfo';
import { ReferendumVoteChart } from './components/shared/ReferendumVoteChart';
import { ReferendumVotingStatusBadge } from './components/shared/ReferendumVotingStatusBadge';

export { additionalInfoSlot, referendumActionsSlot };

export const fellowshipReferendumDetailsFeature = {
  views: {
    ReferendumDetailsModal,
    ReferendumVoteChart,
    ReferendumTrackInfo,
    ReferendumVotingStatusBadge,
  },
};
