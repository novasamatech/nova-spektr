import { referendumDetalsPageRouteSlot } from '@/pages/Fellowship/ui/FellowshipReferendumDetails';

import { ReferendumDetailsModal, additionalInfoSlot, referendumActionsSlot } from './components/ReferendumDetailsModal';
import { ReferendumTrackInfo } from './components/shared/ReferendumTrackInfo';
import { ReferendumVoteChart } from './components/shared/ReferendumVoteChart';
import { ReferendumVotingStatusBadge } from './components/shared/ReferendumVotingStatusBadge';
import { fellowshipReferendumsDetailsFeature } from './model/feature';

export { fellowshipReferendumsDetailsFeature, additionalInfoSlot, referendumActionsSlot };

export const fellowshipReferendumDetails = {
  views: {
    ReferendumVoteChart,
    ReferendumTrackInfo,
    ReferendumVotingStatusBadge,
  },
};

fellowshipReferendumsDetailsFeature.inject(referendumDetalsPageRouteSlot, ({ referendumId, isOpen, onToggle }) => {
  return <ReferendumDetailsModal referendumId={referendumId} isOpen={isOpen} onToggle={onToggle} />;
});
