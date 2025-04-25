import { referendumDetalsPageRouteSlot } from '@/pages/Fellowship/ui/FellowshipReferendumDetails';

import { Card } from './components/Card';
import {
  ReferendumDetailsModal,
  referendumActionsSlot,
  referendumAdditionalHighPriorityInfoSlot,
  referendumAdditionalLowPriorityInfoSlot,
} from './components/ReferendumDetailsModal';
import { fellowshipReferendumsDetailsFeature } from './model/feature';

export {
  fellowshipReferendumsDetailsFeature,
  referendumAdditionalHighPriorityInfoSlot,
  referendumAdditionalLowPriorityInfoSlot,
  referendumActionsSlot,
  Card,
};

fellowshipReferendumsDetailsFeature.inject(referendumDetalsPageRouteSlot, ({ referendumId, isOpen, onToggle }) => {
  return <ReferendumDetailsModal referendumId={referendumId} isOpen={isOpen} onToggle={onToggle} />;
});
