import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Step, isStep } from '@/shared/lib/utils';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, Button } from '@shared/ui';
import { SignButton } from '@/entities/operations';
import { OperationTitle } from '@entities/chain';
import { OperationResult, TransactionSlider } from '@entities/transaction';
import { OperationSign, OperationSubmit } from '@features/operations';
import { EditDelegationConfirmation as Confirmation, basketUtils } from '@features/operations/OperationsConfirm';
import { editDelegationModel } from '../model/edit-delegation-model';

import { DelegateForm } from './DelegateForm';
import { SelectTrackForm } from './SelectTracksForm';

export const EditDelegation = () => {
  const { t } = useI18n();

  const step = useUnit(editDelegationModel.$step);
  const walletData = useUnit(editDelegationModel.$walletData);
  const initiatorWallet = useUnit(editDelegationModel.$initiatorWallet);
  const transactions = useUnit(editDelegationModel.$transactions);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), editDelegationModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    isStep(step, Step.BASKET),
    editDelegationModel.output.flowFinished,
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
        onGoBack={() => editDelegationModel.events.stepChanged(Step.SELECT_TRACK)}
      />
    );
  }

  if (transactions === undefined) {
    return null;
  }

  return (
    <BaseModal
      closeButton
      contentClass="overflow-y-auto flex-1"
      panelClass="max-h-[736px] w-fit flex flex-col"
      isOpen={isModalOpen}
      title={
        <OperationTitle title={t('operations.modalTitles.editDelegationOn')} chainId={walletData.chain!.chainId} />
      }
      onClose={closeModal}
    >
      {isStep(step, Step.CONFIRM) && transactions.length === 1 && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => editDelegationModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => editDelegationModel.events.stepChanged(Step.INIT)}
        />
      )}

      {isStep(step, Step.CONFIRM) && transactions.length > 1 && (
        <TransactionSlider
          count={transactions.length}
          footer={
            <>
              {' '}
              {initiatorWallet && basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => editDelegationModel.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )}
              <SignButton isDefault type={walletData.wallet?.type} onClick={editDelegationModel.events.txsConfirmed} />
            </>
          }
        >
          {transactions?.map((t, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} className="flex h-[600px] flex-col last-of-type:pr-4">
              <div className="max-h-full w-[440px] overflow-y-auto rounded-lg bg-white shadow-shadow-2">
                <Confirmation id={index} hideSignButton />
              </div>
            </div>
          ))}
        </TransactionSlider>
      )}

      {isStep(step, Step.SIGN) && (
        <OperationSign onGoBack={() => editDelegationModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
