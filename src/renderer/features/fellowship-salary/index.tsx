import { useUnit } from 'effector-react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { ButtonCard } from '@/shared/ui';
import { PeriodEndTimer } from '@/shared/ui-entities/PeriodEndTimer/PeriodEndTimer';
import { basketUtils } from '@/entities/basket';
import { salarySlot } from '@/features/fellowship-evidence-salary';
import {
  payoutSalaryTaskActionSlot,
  requestSalaryInductTaskActionSlot,
  requestSalaryTaskActionSlot,
} from '@/features/fellowship-tasks';

import { SalaryInductModal } from './components/SalaryInductModal';
import { SalaryInfo } from './components/SalaryInfo';
import { SalaryPayoutConfirmation } from './components/SalaryPayoutConfirmation';
import { SalaryRegisterConfirmation } from './components/SalaryRegisterConfirmation';
import { SalaryRegisterModal } from './components/SalaryRegisterModal';
import { fellowshipSalaryFeature } from './model/feature';
import { memberSalary } from './model/memberSalary';
import { profile } from './model/profile';
import { salaryInduct } from './model/salaryInduct';
import { salaryPayout } from './model/salaryPayout';
import { salaryRequest } from './model/salaryRequest';

export { fellowshipSalaryFeature, SalaryInfo, SalaryPayoutConfirmation, SalaryRegisterConfirmation };

fellowshipSalaryFeature.inject(salarySlot, () => {
  return <SalaryInfo />;
});

fellowshipSalaryFeature.inject(requestSalaryTaskActionSlot, () => {
  useFlow(salaryRequest.flow, null);

  const { t } = useI18n();
  const account = useUnit(salaryRequest.$account);
  const input = useUnit(fellowshipSalaryFeature.input);
  const currentPeriod = useUnit(memberSalary.$currentPeriod);
  const canVote = useUnit(profile.$canVote);
  const canSaveToBasket = account && basketUtils.isBasketAvailableForAccount(account);
  const currentPeriodExists = currentPeriod && currentPeriod.type !== 'unknown';
  const inBasket = useUnit(salaryRequest.$inBasket);

  if (!input) return null;

  if (canSaveToBasket) {
    return (
      <>
        {currentPeriodExists && <PeriodEndTimer api={input.api} endBlock={currentPeriod.until} shortDateFormat />}
        <ButtonCard
          pallet={inBasket ? 'positive' : 'secondary'}
          size="sm"
          disabled={!canVote}
          onClick={() => salaryRequest.saveToBasket()}
        >
          {t('fellowship.tasks.task.requestSalary.request')}
        </ButtonCard>
      </>
    );
  } else {
    return (
      <>
        {currentPeriodExists && <PeriodEndTimer api={input.api} endBlock={currentPeriod.until} shortDateFormat />}
        <SalaryRegisterModal>
          <ButtonCard size="sm" disabled={!canVote}>
            {t('fellowship.tasks.task.requestSalary.request')}
          </ButtonCard>
        </SalaryRegisterModal>
      </>
    );
  }
});

fellowshipSalaryFeature.inject(requestSalaryInductTaskActionSlot, () => {
  useFlow(salaryInduct.flow, null);
  const { t } = useI18n();
  const account = useUnit(salaryInduct.$account);
  const canVote = useUnit(profile.$canVote);
  const inBasket = useUnit(salaryInduct.$inBasket);

  const canSaveToBasket = account && basketUtils.isBasketAvailableForAccount(account);

  if (canSaveToBasket) {
    return (
      <ButtonCard
        pallet={inBasket ? 'positive' : 'secondary'}
        size="sm"
        disabled={!canVote}
        onClick={() => salaryInduct.saveToBasket()}
      >
        {t('fellowship.tasks.task.requestSalaryInduct.request')}
      </ButtonCard>
    );
  } else {
    return (
      <SalaryInductModal>
        <ButtonCard size="sm" disabled={!canVote}>
          {t('fellowship.tasks.task.requestSalaryInduct.request')}
        </ButtonCard>
      </SalaryInductModal>
    );
  }
});

fellowshipSalaryFeature.inject(payoutSalaryTaskActionSlot, () => {
  useFlow(salaryInduct.flow, null);
  const { t } = useI18n();
  const account = useUnit(salaryPayout.$account);
  const canVote = useUnit(profile.$canVote);
  const inBasket = useUnit(salaryPayout.$inBasket);

  const canSaveToBasket = account && basketUtils.isBasketAvailableForAccount(account);

  if (canSaveToBasket) {
    return (
      <ButtonCard
        pallet={inBasket ? 'positive' : 'secondary'}
        size="sm"
        disabled={!canVote}
        onClick={() => salaryPayout.saveToBasket()}
      >
        {t('fellowship.tasks.task.requestPayout.request')}
      </ButtonCard>
    );
  }

  return (
    <SalaryRegisterModal>
      <ButtonCard size="sm" disabled={!canVote}>
        {t('fellowship.tasks.task.requestPayout.request')}
      </ButtonCard>
    </SalaryRegisterModal>
  );
});
