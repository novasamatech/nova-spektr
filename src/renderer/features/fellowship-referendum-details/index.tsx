import { referendumDetalsPageRouteSlot } from '@/pages/Fellowship/ui/FellowshipReferendumDetails';

import { ReferendumDetailsModal, additionalInfoSlot, referendumActionsSlot } from './components/ReferendumDetailsModal';
import { fellowshipReferendumsDetailsFeature } from './model/feature';

export { fellowshipReferendumsDetailsFeature, additionalInfoSlot, referendumActionsSlot };

fellowshipReferendumsDetailsFeature.inject(referendumDetalsPageRouteSlot, ({ referendumId, isOpen, onToggle }) => {
  return <ReferendumDetailsModal referendumId={referendumId} isOpen={isOpen} onToggle={onToggle} />;
});
