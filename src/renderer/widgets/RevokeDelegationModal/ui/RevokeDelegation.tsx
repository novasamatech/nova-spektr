import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { Step, isStep, nonNullable, nullable } from '@/shared/lib/utils';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, Button } from '@shared/ui';
import { SignButton } from '@/entities/operations';
import { OperationTitle } from '@entities/chain';
import { OperationResult, TransactionSlider } from '@entities/transaction';
import { OperationSign, OperationSubmit } from '@features/operations';
import { RevokeDelegationConfirmation as Confirmation, basketUtils } from '@features/operations/OperationsConfirm';
import { SignatorySelectModal } from '@/pages/Operations/components/modals/SignatorySelectModal';
import { revokeDelegationModel } from '../model/revoke-delegation-model';

export const RevokeDelegation = () => {
  const { t } = useI18n();

  const step = useUnit(revokeDelegationModel.$step);
  const walletData = useUnit(revokeDelegationModel.$walletData);
  const initiatorWallet = useUnit(revokeDelegationModel.$initiatorWallet);
  const transactions = useUnit(revokeDelegationModel.$transactions);
  const signatory = useUnit(revokeDelegationModel.$signatory);
  const signatories = useUnit(revokeDelegationModel.$signatories);
  const network = useUnit(revokeDelegationModel.$network);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), revokeDelegationModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    isStep(step, Step.BASKET),
    revokeDelegationModel.output.flowFinished,
  );

  const shouldPickSignatory = nullable(signatory) && signatories.length > 0;
  const [isSelectSignatoryOpen, setIsSelectSignatoryOpen] = useState(shouldPickSignatory);
  const [isSelectSignatoryClosed, setIsSelectSignatoryClosed] = useState(false);

  const handleSelectSignatoryClose = () => {
    setIsSelectSignatoryOpen(false);
    setIsSelectSignatoryClosed(true);
  };

  useEffect(() => {
    if (shouldPickSignatory) {
      if (isSelectSignatoryClosed) {
        closeModal();
      } else {
        setIsSelectSignatoryOpen(true);
      }
    }
  }, [shouldPickSignatory, isSelectSignatoryClosed, isSelectSignatoryClosed, setIsSelectSignatoryOpen, closeModal]);

  if (!walletData || !network) {
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

  if (transactions === undefined) {
    return null;
  }

  return (
    <BaseModal
      closeButton
      contentClass="overflow-y-auto flex-1"
      panelClass="max-h-[736px] w-fit flex flex-col"
      isOpen={isModalOpen}
      title={<OperationTitle title={t('governance.revokeDelegation.title')} chainId={walletData.chain!.chainId} />}
      onClose={closeModal}
    >
      {isStep(step, Step.CONFIRM) && transactions.length === 1 && (
        <Confirmation
          config={{ withFormatAmount: false }}
          hideSignButton={shouldPickSignatory}
          secondaryActionButton={
            !shouldPickSignatory &&
            nonNullable(initiatorWallet) &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => revokeDelegationModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => revokeDelegationModel.events.stepChanged(Step.INIT)}
        />
      )}

      {isStep(step, Step.CONFIRM) && transactions.length > 1 && (
        <TransactionSlider
          count={transactions.length}
          footer={
            <div className="flex gap-2">
              {initiatorWallet && basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => revokeDelegationModel.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )}

              <SignButton
                isDefault
                type={walletData.wallet?.type}
                onClick={revokeDelegationModel.events.txsConfirmed}
              />
            </div>
          }
        >
          {transactions?.map((t, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} className="flex h-[582px] flex-col last-of-type:pr-4">
              <div className="max-h-full w-[440px] overflow-y-auto rounded-lg bg-white shadow-shadow-2">
                <Confirmation id={index} hideSignButton config={{ withFormatAmount: false }} />
              </div>
            </div>
          ))}
        </TransactionSlider>
      )}

      {isStep(step, Step.SIGN) && (
        <OperationSign onGoBack={() => revokeDelegationModel.events.stepChanged(Step.CONFIRM)} />
      )}

      <SignatorySelectModal
        isOpen={isSelectSignatoryOpen}
        accounts={signatories}
        chain={network.chain}
        nativeAsset={network.asset}
        onClose={handleSelectSignatoryClose}
        onSelect={(a) => {
          revokeDelegationModel.events.selectSignatory(a);
          setIsSelectSignatoryOpen(false);
        }}
      />
    </BaseModal>
  );
};
