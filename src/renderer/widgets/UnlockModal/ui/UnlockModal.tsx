import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@app/providers';
import { useModalClose } from '@shared/lib/hooks';
import { Step, isStep } from '@shared/lib/utils';
import { BaseModal, HeaderTitleText } from '@shared/ui';
import { OperationTitle } from '@entities/chain';
import { OperationResult } from '@entities/transaction';
import { networkSelectorModel } from '@features/governance/model/networkSelector';
import { OperationSign, OperationSubmit } from '@features/operations';
import { unlockAggregate } from '../aggregates/unlock';

import { Confirmation } from './Confirmation';
import { UnlockForm } from './UnlockForm';
import { UnlockInfo } from './UnlockInfo';

export const UnlockModal = () => {
  const { t } = useI18n();

  const step = useUnit(unlockAggregate.$step);
  const governanceChain = useUnit(networkSelectorModel.$governanceChain);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), unlockAggregate.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    isStep(step, Step.BASKET),
    unlockAggregate.output.flowFinished,
  );

  useEffect(() => {
    if (isStep(step, Step.BASKET)) {
      const timer = setTimeout(() => closeBasketModal(), 1450);

      return () => clearTimeout(timer);
    }
  }, [step]);

  if (!governanceChain) {
    return null;
  }

  if (isStep(step, Step.SUBMIT)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  if (isStep(step, Step.BASKET)) {
    return (
      <OperationResult
        isOpen={isBasketModalOpen}
        variant="success"
        title={t('operation.addedToBasket')}
        onClose={closeBasketModal}
      />
    );
  }

  const title = isStep(step, Step.INIT) ? (
    <HeaderTitleText> {t('governance.locks.governanceLock')}</HeaderTitleText>
  ) : (
    <OperationTitle title={t('governance.locks.title')} chainId={governanceChain.chainId} />
  );

  return (
    <BaseModal closeButton contentClass="" isOpen={isModalOpen} title={title} onClose={closeModal}>
      {isStep(step, Step.INIT) && <UnlockInfo />}
      {isStep(step, Step.SELECT) && <UnlockForm onGoBack={() => unlockAggregate.events.stepChanged(Step.INIT)} />}
      {isStep(step, Step.CONFIRM) && <Confirmation onGoBack={() => unlockAggregate.events.stepChanged(Step.SELECT)} />}
      {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => unlockAggregate.events.stepChanged(Step.CONFIRM)} />}
    </BaseModal>
  );
};
