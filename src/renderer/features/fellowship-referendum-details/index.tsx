import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { referendumWidgetActionSlot as promotionReferendumWidgetActionSlot } from '@/features/fellowship-promotion';
import { referendumWidgetActionSlot as retentionReferendumWidgetActionSlot } from '@/features/fellowship-retention';
import { evidenceDetailsModalSlot } from '@/features/fellowship-tasks';

import { Card } from './components/Card';
import { EvidenceDetailsModal, evidenceActionsSlot } from './components/EvidenceDetailsModal/EvidenceDetailsModal';
import {
  ReferendumDetailsModal,
  referendumActionsSlot,
  referendumAdditionalHighPriorityInfoSlot,
  referendumAdditionalInfoSlot,
} from './components/ReferendumDetailsModal';
import { fellowshipReferendumsDetailsFeature } from './feature';

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

fellowshipReferendumsDetailsFeature.inject(evidenceDetailsModalSlot, ({ evidence, title, children }) => {
  return (
    <EvidenceDetailsModal referendum={null} evidence={evidence} title={title}>
      {children}
    </EvidenceDetailsModal>
  );
});

fellowshipReferendumsDetailsFeature.inject(promotionReferendumWidgetActionSlot, ({ referendum }) => {
  const { t } = useI18n();

  return (
    <ReferendumDetailsModal referendumId={referendum.id} isCurrentUser>
      <Button className="ml-auto" size="sm" onClick={() => {}}>
        {t('fellowship.promotion.referendumCreated.viewButton')}
      </Button>
    </ReferendumDetailsModal>
  );
});

fellowshipReferendumsDetailsFeature.inject(retentionReferendumWidgetActionSlot, ({ referendum }) => {
  const { t } = useI18n();

  return (
    <ReferendumDetailsModal referendumId={referendum.id} isCurrentUser>
      <Button className="ml-auto" size="sm" onClick={() => {}}>
        {t('fellowship.promotion.referendumCreated.viewButton')}
      </Button>
    </ReferendumDetailsModal>
  );
});
