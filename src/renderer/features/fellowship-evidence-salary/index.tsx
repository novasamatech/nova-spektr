import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { basketUtils } from '@/entities/basket';
import { activityFeedRecordDescriptionSlot } from '@/features/fellowship-activity-feed';
import { profileInfoSlot } from '@/features/fellowship-profile';
import { evidenceActionsSlot } from '@/features/fellowship-referendum-details';
import {
  evidenceVotingTaskActionSlot,
  payoutSalaryTaskActionSlot,
  requestPromotionTaskActionSlot,
  requestRetentionATaskActionSlot,
  requestSalaryInductTaskActionSlot,
  requestSalaryTaskActionSlot,
} from '@/features/fellowship-tasks';
import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { EntrypointCard } from './components/EntrypointCard';
import { EvidencePostFlowModal } from './components/EvidencePostFlowModal';
import { PeriodEndTimer } from './components/PeriodEndTimer';
import { PromotionInfo } from './components/PromotionInfo';
import { SalaryInductModal } from './components/SalaryInductModal';
import { SalaryPayoutConfirmation } from './components/SalaryPayoutConfirmation';
import { SalaryRegisterConfirmation } from './components/SalaryRegisterConfirmation';
import { SalaryRegisterModal } from './components/SalaryRegisterModal';
import { SubmitEvidenceConfirmation } from './components/SubmitEvidenceConfirmation';
import { VotingActions } from './components/VotingActions';
import { fellowshipSalaryFeature } from './model/feature';
import { memberSalary } from './model/memberSalary';
import { profile } from './model/profile';
import { salaryInduct } from './model/salaryInduct';
import { salaryPayout } from './model/salaryPayout';
import { salaryRequest } from './model/salaryRequest';

export { fellowshipSalaryFeature, SalaryRegisterConfirmation, SalaryPayoutConfirmation, SubmitEvidenceConfirmation };

fellowshipSalaryFeature.inject(fellowshipSidebarSlot, {
  order: 1,
  render: () => <EntrypointCard />,
});

fellowshipSalaryFeature.inject(requestSalaryTaskActionSlot, () => {
  const { t } = useI18n();
  const account = useUnit(salaryRequest.$account);
  const currentPeriod = useUnit(memberSalary.$currentPeriod);
  const canVote = useUnit(profile.$canVote);
  const canSaveToBasket = account && basketUtils.isBasketAvailableForAccount(account);
  const currentPeriodExists = currentPeriod && currentPeriod.type !== 'unknown';

  if (canSaveToBasket) {
    return (
      <>
        {currentPeriodExists && <PeriodEndTimer endBlock={currentPeriod.until} shortDateFormat />}
        <Button size="sm" disabled={!canVote} onClick={() => salaryRequest.saveToBasket()}>
          {t('fellowship.tasks.task.requestSalary.request')}
        </Button>
      </>
    );
  } else {
    return (
      <>
        {currentPeriodExists && <PeriodEndTimer endBlock={currentPeriod.until} shortDateFormat />}
        <SalaryRegisterModal>
          <Button size="sm" disabled={!canVote}>
            {t('fellowship.tasks.task.requestSalary.request')}
          </Button>
        </SalaryRegisterModal>
      </>
    );
  }
});

fellowshipSalaryFeature.inject(requestSalaryInductTaskActionSlot, () => {
  const { t } = useI18n();
  const account = useUnit(salaryInduct.$account);
  const canVote = useUnit(profile.$canVote);
  const canSaveToBasket = account && basketUtils.isBasketAvailableForAccount(account);

  if (canSaveToBasket) {
    return (
      <Button size="sm" disabled={!canVote} onClick={() => salaryInduct.saveToBasket()}>
        {t('fellowship.tasks.task.requestSalaryInduct.request')}
      </Button>
    );
  } else {
    return (
      <SalaryInductModal>
        <Button size="sm" disabled={!canVote}>
          {t('fellowship.tasks.task.requestSalaryInduct.request')}
        </Button>
      </SalaryInductModal>
    );
  }
});

fellowshipSalaryFeature.inject(payoutSalaryTaskActionSlot, () => {
  const { t } = useI18n();
  const account = useUnit(salaryPayout.$account);
  const canVote = useUnit(profile.$canVote);
  const canSaveToBasket = account && basketUtils.isBasketAvailableForAccount(account);

  if (canSaveToBasket) {
    return (
      <Button size="sm" disabled={!canVote} onClick={() => salaryPayout.saveToBasket()}>
        {t('fellowship.tasks.task.requestPayout.request')}
      </Button>
    );
  } else {
    return (
      <SalaryRegisterModal>
        <Button size="sm" disabled={!canVote}>
          {t('fellowship.tasks.task.requestPayout.request')}
        </Button>
      </SalaryRegisterModal>
    );
  }
});

fellowshipSalaryFeature.inject(requestPromotionTaskActionSlot, () => {
  const { t } = useI18n();
  const canVote = useUnit(profile.$canVote);

  return (
    <EvidencePostFlowModal wish="Promotion">
      <Button size="sm" disabled={!canVote}>
        {t('fellowship.tasks.task.promotion.request')}
      </Button>
    </EvidencePostFlowModal>
  );
});

fellowshipSalaryFeature.inject(requestRetentionATaskActionSlot, () => {
  const { t } = useI18n();
  const canVote = useUnit(profile.$canVote);

  return (
    <EvidencePostFlowModal wish="Retention">
      <Button size="sm" className="w-[102px]" disabled={!canVote}>
        {t('fellowship.tasks.task.retention.request')}
      </Button>
    </EvidencePostFlowModal>
  );
});

fellowshipSalaryFeature.inject(profileInfoSlot, () => {
  return <PromotionInfo />;
});

fellowshipSalaryFeature.inject(activityFeedRecordDescriptionSlot, ({ t, record }) => {
  switch (record.type) {
    case 'promoted':
      return <>{t('fellowship.activityFeed.record.promoted', { rank: record.rank })}</>;
    case 'demoted':
      return <>{t('fellowship.activityFeed.record.demoted', { rank: record.rank })}</>;
    case 'proven':
      return <>{t('fellowship.activityFeed.record.proven', { rank: record.rank })}</>;
    case 'requested':
      return record.wish === 'Promotion' ? (
        <>{t('fellowship.activityFeed.record.submittedPromotion')}</>
      ) : (
        <>{t('fellowship.activityFeed.record.submittedRetention')}</>
      );
    default:
      return null;
  }
});

fellowshipSalaryFeature.inject(evidenceVotingTaskActionSlot, ({ evidence, endBlock }) => {
  const canVote = useUnit(profile.$canVote);

  return <VotingActions evidence={evidence} endBlock={endBlock} variant="small" disabled={!canVote} />;
});

fellowshipSalaryFeature.inject(evidenceActionsSlot, ({ evidence }) => {
  const canVote = useUnit(profile.$canVote);

  return <VotingActions evidence={evidence} endBlock={null} variant="large" disabled={!canVote} />;
});
