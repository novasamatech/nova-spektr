import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { hasActionRequestAnyOf, profileInfoSlot } from '@/features/fellowship-profile';
import { requestSalaryActionSlot } from '@/features/fellowship-tasks';
import { fellowshipHeaderCardsSlot } from '@/pages/Fellowship/ui/Fellowship';

import { EntrypointCard } from './components/EntrypointCard';
import { PromotionInfo } from './components/PromotionInfo';
import { SalaryPayoutConfirmation } from './components/SalaryPayoutConfirmation';
import { SalaryRegisterConfirmation } from './components/SalaryRegisterConfirmation';
import { SalaryRegisterModal } from './components/SalaryRegisterModal';
import { SubmitEvidenceConfirmation } from './components/SubmitEvidenceConfirmation';
import { evidenceInfo } from './model/evidence';
import { fellowshipSalaryFeature } from './model/feature';

export { fellowshipSalaryFeature, SalaryRegisterConfirmation, SalaryPayoutConfirmation, SubmitEvidenceConfirmation };

fellowshipSalaryFeature.inject(fellowshipHeaderCardsSlot, {
  order: 1,
  render: () => <EntrypointCard />,
});

fellowshipSalaryFeature.inject(requestSalaryActionSlot, () => {
  const { t } = useI18n();
  return (
    <SalaryRegisterModal>
      <Button variant="fill">{t('fellowship.tasks.task.requestSalary.request')}</Button>
    </SalaryRegisterModal>
  );
});

fellowshipSalaryFeature.inject(profileInfoSlot, () => {
  return <PromotionInfo />;
});

fellowshipSalaryFeature.inject(hasActionRequestAnyOf, () => {
  const leftToPromotionPeriod = useUnit(evidenceInfo.$leftToPromotion);
  return leftToPromotionPeriod === 0;
});
