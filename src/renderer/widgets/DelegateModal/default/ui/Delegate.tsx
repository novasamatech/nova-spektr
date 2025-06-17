import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep, nullable } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { DelegateConfirmation as Confirmation } from '@/features/operations/OperationsConfirm/Delegate';
import { delegateModel } from '../model/delegate-model';
import { formModel } from '../model/form-model';

import { DelegateForm } from './DelegateForm';
import { SelectTrackForm } from './SelectTracksForm';

export const Delegate = () => {
  const { t } = useI18n();

  const step = useUnit(delegateModel.$step);
  const walletData = useUnit(formModel.$walletData);
  const initiatorWallet = useUnit(delegateModel.$initiatorWallet);
  const transaction = useUnit(delegateModel.$transactions);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), delegateModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    isStep(step, Step.BASKET),
    delegateModel.output.flowFinished,
  );

  if (!walletData) {
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

  if (isStep(step, Step.SELECT_TRACK)) {
    return <SelectTrackForm isOpen={isStep(step, Step.SELECT_TRACK)} onClose={closeModal} />;
  }

  if (isStep(step, Step.INIT)) {
    return (
      <DelegateForm
        isOpen={isStep(step, Step.INIT)}
        onClose={closeModal}
        onGoBack={() => delegateModel.events.stepChanged(Step.SELECT_TRACK)}
      />
    );
  }

  if (nullable(transaction)) {
    return null;
  }

  const title = t('governance.addDelegation.title');

  return (
    <Modal isOpen={isModalOpen} size="fit" height="fit" onToggle={(open) => !open && closeModal()}>
      <Modal.Title close>
        <OperationTitle title={t(title)} chainId={walletData.chain!.chainId} />
      </Modal.Title>

      <Modal.Content>
        {isStep(step, Step.CONFIRM) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => delegateModel.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => delegateModel.events.stepChanged(Step.INIT)}
          />
        )}

        {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => delegateModel.events.stepChanged(Step.CONFIRM)} />}
      </Modal.Content>
    </Modal>
  );
};
