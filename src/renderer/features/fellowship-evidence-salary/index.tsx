import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { basketUtils } from '@/entities/basket';
import { additionalProfileCardInfoSlot, profileInfoSlot } from '@/features/fellowship-profile';
import {
  payoutSalaryActionSlot,
  requestSalaryActionSlot,
  requestSalaryInductActionSlot,
} from '@/features/fellowship-tasks';
import { fellowshipHeaderCardsSlot } from '@/pages/Fellowship/ui/Fellowship';

import { DotIndicator } from './components/DotIndicator';
import { EntrypointCard } from './components/EntrypointCard';
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

fellowshipSalaryFeature.inject(fellowshipHeaderCardsSlot, {
  order: 1,
  render: () => <EntrypointCard />,
});

fellowshipSalaryFeature.inject(requestSalaryActionSlot, () => {
  const { t } = useI18n();
  const account = useUnit(salaryRequest.$account);
  const canSaveToBasket = account && basketUtils.isBasketAvailableForAccount(account);

  if (canSaveToBasket) {
    return (
      <Button onClick={() => salaryRequest.saveToBasket()}>{t('fellowship.tasks.task.requestSalary.request')}</Button>
    );
  } else {
    return (
      <SalaryRegisterModal>
        <Button>{t('fellowship.tasks.task.requestSalary.request')}</Button>
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
      <Button onClick={() => salaryInduct.saveToBasket()}>
        {t('fellowship.tasks.task.requestSalaryInduct.request')}
      </Button>
    );
  } else {
    return (
      <SalaryInductModal>
        <Button>{t('fellowship.tasks.task.requestSalaryInduct.request')}</Button>
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
      <Button onClick={() => salaryPayout.saveToBasket()}>{t('fellowship.tasks.task.requestPayout.request')}</Button>
    );
  } else {
    return (
      <SalaryRegisterModal>
        <Button>{t('fellowship.tasks.task.requestPayout.request')}</Button>
      </SalaryRegisterModal>
    );
  }
});

fellowshipSalaryFeature.inject(profileInfoSlot, () => {
  return <PromotionInfo />;
});

fellowshipSalaryFeature.inject(additionalProfileCardInfoSlot, () => {
  const leftToPromotionPeriod = useUnit(evidenceInfo.$leftToPromotion);
  return leftToPromotionPeriod === 0 ? <DotIndicator /> : null;
});
