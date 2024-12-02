import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep } from '@/shared/lib/utils';
import { Button, HeaderTitleText } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { networkSelectorModel } from '@/features/governance/model/networkSelector';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { unlockAggregate } from '../aggregates/unlock';

import { UnlockConfirmation } from './UnlockConfirmation';
import { UnlockForm } from './UnlockForm';
import { UnlockInfo } from './UnlockInfo';

export const UnlockModal = () => {
  const { t } = useI18n();

  const step = useUnit(unlockAggregate.$step);
  const chainId = useUnit(networkSelectorModel.$governanceChainId);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), unlockAggregate.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    isStep(step, Step.BASKET),
    unlockAggregate.output.flowFinished,
  );

  if (!chainId) {
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
    <OperationTitle title={t('governance.locks.title')} chainId={chainId} />
  );

  return (
    <Modal isOpen={isModalOpen} size="md" onToggle={(isOpen) => !isOpen && closeModal()}>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content>
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
      </Modal.Content>
    </Modal>
  );
};
