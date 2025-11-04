import { useUnit } from 'effector-react';
import React from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, ButtonCard } from '@/shared/ui';
import { evidenceSlot } from '@/features/fellowship-evidence-salary';
import { evidenceActionsSlot } from '@/features/fellowship-referendum-details';
import { evidenceSubmitSlot } from '@/features/fellowship-retention';
import {
  evidenceVotingTaskActionSlot,
  requestPromotionTaskActionSlot,
  requestRetentionTaskActionSlot,
} from '@/features/fellowship-tasks';

import { EvidencePostFlowModal } from './components/EvidencePostFlowModal';
import { RetentionInfo } from './components/RetentionInfo';
import { SubmitEvidenceConfirmation } from './components/SubmitEvidenceConfirmation';
import { SubmitEvidencePopover } from './components/SubmitEvidencePopover';
import { VotingActions } from './components/VotingActions';
import { VotingActionsCard } from './components/VotingActionsCard';
import { fellowshipEvidenceFeature } from './model/feature';
import { profile } from './model/profile';

export { fellowshipEvidenceFeature, RetentionInfo, SubmitEvidenceConfirmation, SubmitEvidencePopover };

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

fellowshipEvidenceFeature.inject(evidenceVotingTaskActionSlot, ({ evidence, endBlock }) => {
  const canVote = useUnit(profile.$canVote);

  return <VotingActions evidence={evidence} endBlock={endBlock} variant="small" disabled={!canVote} />;
});

fellowshipEvidenceFeature.inject(evidenceActionsSlot, ({ evidence }) => {
  const canVote = useUnit(profile.$canVote);

  return <VotingActionsCard evidence={evidence} endBlock={null} variant="large" disabled={!canVote} />;
});

fellowshipEvidenceFeature.inject(requestRetentionTaskActionSlot, () => {
  const { t } = useI18n();
  const canVote = useUnit(profile.$canVote);

  return (
    <EvidencePostFlowModal wish="Retention">
      <ButtonCard size="sm" disabled={!canVote}>
        {t('fellowship.tasks.task.retention.request')}
      </ButtonCard>
    </EvidencePostFlowModal>
  );
});

fellowshipEvidenceFeature.inject(
  evidenceSubmitSlot,
  ({ wish, mode }: { wish: 'Promotion' | 'Retention'; mode?: 'submit' | 'edit' }) => {
    const { t } = useI18n();
    const canVote = useUnit(profile.$canVote);
    const isEdit = mode === 'edit';

    if (isEdit) {
      return (
        <EvidencePostFlowModal wish={wish}>
          <Button size="sm" pallet="secondary" variant="fill" disabled={!canVote}>
            {t('fellowship.retention.button.edit')}
          </Button>
        </EvidencePostFlowModal>
      );
    }

    return (
      <SubmitEvidencePopover wish={wish}>
        <Button size="sm" pallet="primary" variant="fill" disabled={!canVote}>
          {t('fellowship.retention.button.submitReport')}
        </Button>
      </SubmitEvidencePopover>
    );
  },
);
