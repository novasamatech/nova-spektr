import { useUnit } from 'effector-react';
import React, { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Button, ButtonCard } from '@/shared/ui';
import { evidenceSlot } from '@/features/fellowship-evidence-salary';
import { evidenceSubmitSlot as promotionEvidenceSubmitSlot } from '@/features/fellowship-promotion';
import { evidenceActionsSlot } from '@/features/fellowship-referendum-details';
import { evidenceSubmitSlot as retentionEvidenceSubmitSlot } from '@/features/fellowship-retention';
import {
  evidenceVotingTaskActionSlot,
  requestPromotionTaskActionSlot,
  requestRetentionTaskActionSlot,
} from '@/features/fellowship-tasks';

import { EvidencePostFlowModal } from './components/EvidencePostFlowModal';
import { EvidenceVotingConfirmation } from './components/EvidenceVotingConfirmation';
import { MarkdownPreviewModal } from './components/MarkdownPreviewModal';
import { RetentionInfo } from './components/RetentionInfo';
import { SubmitEvidenceConfirmation } from './components/SubmitEvidenceConfirmation';
import { SubmitEvidencePopover } from './components/SubmitEvidencePopover';
import { VotingActions } from './components/VotingActions';
import { VotingActionsCard } from './components/VotingActionsCard';
import { fellowshipEvidenceFeature } from './model/feature';
import { profile } from './model/profile';

export {
  fellowshipEvidenceFeature,
  RetentionInfo,
  SubmitEvidenceConfirmation,
  EvidenceVotingConfirmation,
  SubmitEvidencePopover,
};

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

fellowshipEvidenceFeature.inject(evidenceVotingTaskActionSlot, ({ evidence, endBlock, transaction }) => {
  const canVote = useUnit(profile.$canVote);
  return (
    <VotingActions
      evidence={evidence}
      endBlock={endBlock}
      transaction={transaction}
      variant="small"
      disabled={!canVote}
    />
  );
});

fellowshipEvidenceFeature.inject(evidenceActionsSlot, ({ evidence, transaction, onClose }) => {
  const canVote = useUnit(profile.$canVote);

  return (
    <VotingActionsCard
      evidence={evidence}
      endBlock={null}
      variant="large"
      disabled={!canVote}
      transaction={transaction}
      onClose={onClose}
    />
  );
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

fellowshipEvidenceFeature.inject(retentionEvidenceSubmitSlot, ({ mode }) => {
  const { t } = useI18n();
  const canVote = useUnit(profile.$canVote);
  const isEdit = mode === 'edit';

  if (isEdit) {
    return (
      <EvidencePostFlowModal wish="Retention">
        <Button size="sm" pallet="secondary" variant="fill" disabled={!canVote}>
          {t('fellowship.retention.button.edit')}
        </Button>
      </EvidencePostFlowModal>
    );
  }

  return (
    <SubmitEvidencePopover wish="Retention">
      <Button size="sm" pallet="primary" variant="fill" disabled={!canVote}>
        {t('fellowship.retention.button.submitReport')}
      </Button>
    </SubmitEvidencePopover>
  );
});

fellowshipEvidenceFeature.inject(promotionEvidenceSubmitSlot, ({ mode, evidenceContent }) => {
  const { t } = useI18n();
  const canVote = useUnit(profile.$canVote);
  const [isOpen, setIsOpen] = useState(false);

  if (nonNullable(evidenceContent) && mode === 'edit') {
    return (
      <>
        <MarkdownPreviewModal isOpen={isOpen} evidenceContent={evidenceContent} wish="Promotion" onToggle={setIsOpen}>
          <Button size="sm">{t('fellowship.promotion.submitted.viewButton')}</Button>
        </MarkdownPreviewModal>
        <EvidencePostFlowModal wish="Retention">
          <Button size="sm" pallet="secondary" variant="fill" disabled={!canVote}>
            {t('fellowship.retention.button.edit')}
          </Button>
        </EvidencePostFlowModal>
      </>
    );
  }

  if (mode === 'submit') {
    return (
      <SubmitEvidencePopover wish="Promotion">
        <Button size="sm" pallet="primary" variant="fill" disabled={!canVote}>
          {t('fellowship.promotion.canSubmit.submitButton')}
        </Button>
      </SubmitEvidencePopover>
    );
  }
});
