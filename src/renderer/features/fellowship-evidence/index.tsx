import { useUnit } from 'effector-react';
import React from 'react';

import { useI18n } from '@/shared/i18n';
import { ButtonCard, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { evidenceSlot } from '@/features/fellowship-evidence-salary';
import { profileInfoSlot } from '@/features/fellowship-profile';
import { Card, evidenceActionsSlot } from '@/features/fellowship-referendum-details';
import { evidenceVotingTaskActionSlot, requestPromotionTaskActionSlot } from '@/features/fellowship-tasks';

import { EvidencePostFlowModal } from './components/EvidencePostFlowModal';
import { PromotionInfo } from './components/PromotionInfo';
import { RetentionInfo } from './components/RetentionInfo';
import { SubmitEvidenceConfirmation } from './components/SubmitEvidenceConfirmation';
import { VotingActions } from './components/VotingActions';
import { fellowshipEvidenceFeature } from './model/feature';
import { profile } from './model/profile';

export { fellowshipEvidenceFeature, RetentionInfo, SubmitEvidenceConfirmation };

fellowshipEvidenceFeature.inject(evidenceSlot, () => {
  return <RetentionInfo />;
});

fellowshipEvidenceFeature.inject(requestPromotionTaskActionSlot, () => {
  const { t } = useI18n();
  const canVote = useUnit(profile.$canVote);

  return (
    <EvidencePostFlowModal wish="Promotion">
      <ButtonCard size="sm" disabled={!canVote}>
        {t('fellowship.tasks.task.promotion.request')}
      </ButtonCard>
    </EvidencePostFlowModal>
  );
});

fellowshipEvidenceFeature.inject(profileInfoSlot, () => {
  return <PromotionInfo />;
});

fellowshipEvidenceFeature.inject(evidenceVotingTaskActionSlot, ({ evidence, endBlock }) => {
  const canVote = useUnit(profile.$canVote);

  return <VotingActions evidence={evidence} endBlock={endBlock} variant="small" disabled={!canVote} />;
});

fellowshipEvidenceFeature.inject(evidenceActionsSlot, ({ evidence }) => {
  const { t } = useI18n();

  const canVote = useUnit(profile.$canVote);
  return (
    <Card>
      <Box fillContainer gap={6} padding={6}>
        <SmallTitleText>{t('fellowship.tasks.titles.votingTitle')}</SmallTitleText>
        <VotingActions evidence={evidence} endBlock={null} variant="large" disabled={!canVote} />
      </Box>
    </Card>
  );
});
