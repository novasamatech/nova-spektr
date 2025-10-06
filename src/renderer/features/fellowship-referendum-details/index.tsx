import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { referendumWidgetActionSlot } from '@/features/fellowship-promotion';

import { Card } from './components/Card';
import { EvidenceDetailsModal, evidenceActionsSlot } from './components/EvidenceDetailsModal/EvidenceDetailsModal';
import {
  ReferendumDetailsModal,
  referendumActionsSlot,
  referendumAdditionalHighPriorityInfoSlot,
  referendumAdditionalInfoSlot,
} from './components/ReferendumDetailsModal';
import { fellowshipReferendumsDetailsFeature } from './model/feature';

export {
  fellowshipReferendumsDetailsFeature,
  referendumAdditionalHighPriorityInfoSlot,
  referendumAdditionalInfoSlot,
  referendumActionsSlot,
  evidenceActionsSlot,
  Card,
  ReferendumDetailsModal,
  EvidenceDetailsModal,
};

fellowshipReferendumsDetailsFeature.inject(referendumWidgetActionSlot, ({ referendum }) => {
  const { t } = useI18n();

  return (
    <ReferendumDetailsModal referendum={referendum} isCurrentUser>
      <Button className="ml-auto" size="sm" onClick={() => {}}>
        {t('fellowship.promotion.referendumCreated.viewButton')}
      </Button>
    </ReferendumDetailsModal>
  );
});
