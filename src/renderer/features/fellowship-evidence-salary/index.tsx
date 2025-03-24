import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { basketUtils } from '@/entities/basket';
import { activityFeedRecordDescriptionSlot } from '@/features/fellowship-activity-feed';
import { additionalProfileCardInfoSlot, profileInfoSlot } from '@/features/fellowship-profile';
import {
  payoutSalaryActionSlot,
  requestPromotionActionSlot,
  requestRetentionActionSlot,
  requestSalaryActionSlot,
  requestSalaryInductActionSlot,
} from '@/features/fellowship-tasks';
import { fellowshipSidebarSlot } from '@/pages/Fellowship/ui/Fellowship';

import { DotIndicator } from './components/DotIndicator';
import { EntrypointCard } from './components/EntrypointCard';
import { EvidencePostFlowModal } from './components/EvidencePostFlowModal';
import { PromotionInfo } from './components/PromotionInfo';
import { SalaryInductModal } from './components/SalaryInductModal';
import { SalaryPayoutConfirmation } from './components/SalaryPayoutConfirmation';
import { SalaryRegisterConfirmation } from './components/SalaryRegisterConfirmation';
import { SalaryRegisterModal } from './components/SalaryRegisterModal';
import { SubmitEvidenceConfirmation } from './components/SubmitEvidenceConfirmation';
import { evidenceInfo } from './model/evidence';
import { fellowshipSalaryFeature } from './model/feature';
import { salaryInduct } from './model/salaryInduct';
import { salaryPayout } from './model/salaryPayout';
import { salaryRequest } from './model/salaryRequest';

export { fellowshipSalaryFeature, SalaryRegisterConfirmation, SalaryPayoutConfirmation, SubmitEvidenceConfirmation };

fellowshipSalaryFeature.inject(fellowshipSidebarSlot, {
  order: 1,
  render: () => <EntrypointCard />,
});

fellowshipSalaryFeature.inject(requestSalaryActionSlot, () => {
  const { t } = useI18n();
  const account = useUnit(salaryRequest.$account);
  const canSaveToBasket = account && basketUtils.isBasketAvailableForAccount(account);

  if (canSaveToBasket) {
    return (
      <Button size="sm" onClick={() => salaryRequest.saveToBasket()}>
        {t('fellowship.tasks.task.requestSalary.request')}
      </Button>
    );
  } else {
    return (
      <SalaryRegisterModal>
        <Button size="sm">{t('fellowship.tasks.task.requestSalary.request')}</Button>
      </SalaryRegisterModal>
    );
  }
});

fellowshipSalaryFeature.inject(requestSalaryInductActionSlot, () => {
  const { t } = useI18n();
  const account = useUnit(salaryInduct.$account);
  const canSaveToBasket = account && basketUtils.isBasketAvailableForAccount(account);

  if (canSaveToBasket) {
    return (
      <Button size="sm" onClick={() => salaryInduct.saveToBasket()}>
        {t('fellowship.tasks.task.requestSalaryInduct.request')}
      </Button>
    );
  } else {
    return (
      <SalaryInductModal>
        <Button size="sm">{t('fellowship.tasks.task.requestSalaryInduct.request')}</Button>
      </SalaryInductModal>
    );
  }
});

fellowshipSalaryFeature.inject(payoutSalaryActionSlot, () => {
  const { t } = useI18n();
  const account = useUnit(salaryPayout.$account);
  const canSaveToBasket = account && basketUtils.isBasketAvailableForAccount(account);

  if (canSaveToBasket) {
    return (
      <Button size="sm" onClick={() => salaryPayout.saveToBasket()}>
        {t('fellowship.tasks.task.requestPayout.request')}
      </Button>
    );
  } else {
    return (
      <SalaryRegisterModal>
        <Button size="sm">{t('fellowship.tasks.task.requestPayout.request')}</Button>
      </SalaryRegisterModal>
    );
  }
});

fellowshipSalaryFeature.inject(requestPromotionActionSlot, () => {
  const { t } = useI18n();
  return (
    <EvidencePostFlowModal wish="Promotion">
      <Button size="sm">{t('fellowship.tasks.task.promotion.request')}</Button>
    </EvidencePostFlowModal>
  );
});

fellowshipSalaryFeature.inject(requestRetentionActionSlot, () => {
  const { t } = useI18n();
  return (
    <EvidencePostFlowModal wish="Retention">
      <Button size="sm">{t('fellowship.tasks.task.retention.request')}</Button>
    </EvidencePostFlowModal>
  );
});

fellowshipSalaryFeature.inject(profileInfoSlot, () => {
  return <PromotionInfo />;
});

fellowshipSalaryFeature.inject(additionalProfileCardInfoSlot, () => {
  const leftToPromotionPeriod = useUnit(evidenceInfo.$leftToPromotion);

  return leftToPromotionPeriod === 0 ? <DotIndicator /> : null;
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
