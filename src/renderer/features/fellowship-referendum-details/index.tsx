import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { alertsReferendumSlot, referendumActivityItemActionSlot } from '@/features/fellowship-profile';
import { referendumWidgetActionSlot as promotionReferendumWidgetActionSlot } from '@/features/fellowship-promotion';
import { referendumWidgetActionSlot as retentionReferendumWidgetActionSlot } from '@/features/fellowship-retention';
import {
  completedReferendumVotingSlot,
  evidenceDetailsModalSlot,
  ongoingReferendumVotingSlot,
  promotionRetentionReferendumVotingSlot,
} from '@/features/fellowship-tasks';

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

fellowshipReferendumsDetailsFeature.inject(evidenceDetailsModalSlot, ({ evidence, title, children, transaction }) => {
  return (
    <EvidenceDetailsModal referendum={null} evidence={evidence} title={title} transaction={transaction}>
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

fellowshipReferendumsDetailsFeature.inject(referendumActivityItemActionSlot, ({ referendumId }) => {
  const { t } = useI18n();

  return (
    <ReferendumDetailsModal referendumId={referendumId}>
      <span className="cursor-pointer font-semibold text-primary-button-background-default">
        {t('fellowship.profile.activityFeed.viewReferendum')}
      </span>
    </ReferendumDetailsModal>
  );
});

fellowshipReferendumsDetailsFeature.inject(promotionRetentionReferendumVotingSlot, ({ referendumId, children }) => {
  return <ReferendumDetailsModal referendumId={referendumId}>{children}</ReferendumDetailsModal>;
});

fellowshipReferendumsDetailsFeature.inject(completedReferendumVotingSlot, ({ referendumId, children }) => {
  return <ReferendumDetailsModal referendumId={referendumId}>{children}</ReferendumDetailsModal>;
});

fellowshipReferendumsDetailsFeature.inject(ongoingReferendumVotingSlot, ({ referendumId, children }) => {
  return <ReferendumDetailsModal referendumId={referendumId}>{children}</ReferendumDetailsModal>;
});

fellowshipReferendumsDetailsFeature.inject(alertsReferendumSlot, ({ referendumId, children }) => {
  return <ReferendumDetailsModal referendumId={referendumId}>{children}</ReferendumDetailsModal>;
});
