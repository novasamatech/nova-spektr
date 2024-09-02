import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { useModalClose } from '@shared/lib/hooks';
import { Step, isStep } from '@shared/lib/utils';
import { BaseModal, Button, HeaderTitleText } from '@shared/ui';
import { OperationTitle } from '@entities/chain';
import { OperationResult } from '@entities/transaction';
import { networkSelectorModel } from '@features/governance/model/networkSelector';
import { OperationSign, OperationSubmit } from '@features/operations';
import { unlockAggregate } from '../aggregates/unlock';

import { UnlockConfirmation } from './UnlockConfirmation';
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
        autoCloseTimeout={2000}
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
      {isStep(step, Step.CONFIRM) && (
        <UnlockConfirmation
          secondaryActionButton={
            <Button pallet="secondary" onClick={() => unlockAggregate.events.txSaved()}>
              {t('operation.addToBasket')}
            </Button>
          }
          onGoBack={() => unlockAggregate.events.stepChanged(Step.SELECT)}
        />
      )}
      {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => unlockAggregate.events.stepChanged(Step.CONFIRM)} />}
    </BaseModal>
  );
};
