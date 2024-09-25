import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { Step, isStep } from '@/shared/lib/utils';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, Button } from '@shared/ui';
import { SignButton } from '@/entities/operations';
import { OperationTitle } from '@entities/chain';
import { OperationResult, TransactionSlider } from '@entities/transaction';
import { OperationSign, OperationSubmit } from '@features/operations';
import { DelegateConfirmation as Confirmation, basketUtils } from '@features/operations/OperationsConfirm';
import { delegateModel } from '../model/delegate-model';

import { DelegateForm } from './DelegateForm';
import { SelectTrackForm } from './SelectTracksForm';

export const Delegate = () => {
  const { t } = useI18n();

  const step = useUnit(delegateModel.$step);
  const walletData = useUnit(delegateModel.$walletData);
  const initiatorWallet = useUnit(delegateModel.$initiatorWallet);
  const transactions = useUnit(delegateModel.$transactions);

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

  if (transactions === undefined) {
    return null;
  }

  return (
    <BaseModal
      closeButton
      contentClass="overflow-y-auto flex-1"
      panelClass="max-h-[736px] w-fit flex flex-col"
      isOpen={isModalOpen}
      title={<OperationTitle title={t('governance.addDelegation.title')} chainId={walletData.chain!.chainId} />}
      onClose={closeModal}
    >
      {isStep(step, Step.CONFIRM) && transactions.length === 1 && (
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

      {isStep(step, Step.CONFIRM) && transactions.length > 1 && (
        <TransactionSlider
          count={transactions.length}
          footer={
            <div className="flex gap-2">
              {initiatorWallet && basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => delegateModel.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )}

              <SignButton isDefault type={walletData.wallet?.type} onClick={delegateModel.events.txsConfirmed} />
            </div>
          }
        >
          {transactions.map((_, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} className="flex h-[582px] flex-col last-of-type:pr-4">
              <div className="max-h-full w-[440px] overflow-y-auto rounded-lg bg-white shadow-shadow-2">
                <Confirmation id={index} hideSignButton />
              </div>
            </div>
          ))}
        </TransactionSlider>
      )}

      {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => delegateModel.events.stepChanged(Step.CONFIRM)} />}
    </BaseModal>
  );
};
