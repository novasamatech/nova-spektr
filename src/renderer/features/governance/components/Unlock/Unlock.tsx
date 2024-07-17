import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@app/providers';
import { useModalClose } from '@shared/lib/hooks';
import { Step, isStep } from '@shared/lib/utils';
import { BaseModal, HeaderTitleText } from '@shared/ui';
import { OperationTitle } from '@entities/chain';
import { OperationResult } from '@entities/transaction';
import { networkSelectorModel } from '../../model/networkSelector';
import { unlockModel } from '../../model/unlock';

import { UnlockInfo } from './UnlockInfo';

export const Unlock = () => {
  const { t } = useI18n();

  const step = useUnit(unlockModel.$step);
  const governanceChain = useUnit(networkSelectorModel.$governanceChain);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), unlockModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    isStep(step, Step.BASKET),
    unlockModel.output.flowFinished,
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
    </BaseModal>
  );
};
