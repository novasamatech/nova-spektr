import { useUnit } from 'effector-react';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@app/providers';
import { Step, cnTw, isStep, nonNullable, nullable } from '@/shared/lib/utils';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, Button, IconButton } from '@shared/ui';
import { SignButton } from '@/entities/operations';
import { OperationTitle } from '@entities/chain';
import { OperationResult } from '@entities/transaction';
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

  const [currentTx, setCurrentTx] = useState(0);

  const ref = useRef<HTMLDivElement>(null);

  const scroll = (value: number) => {
    setTimeout(() =>
      // @ts-expect-error TS doesn't recognize offsetLeft
      ref.current?.scrollTo({ left: ref.current?.childNodes[0].childNodes[value].offsetLeft - 16, behavior: 'smooth' }),
    );
  };

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

  const nextTx = () => {
    if (transactions && currentTx < transactions.length - 1) {
      const newValue = currentTx + 1;

      setCurrentTx(newValue);
      scroll(newValue);
    }
  };

  const previousTx = () => {
    if (currentTx > 0) {
      const newValue = currentTx - 1;

      setCurrentTx(newValue);
      scroll(newValue);
    }
  };

  const currentPage = currentTx + 1;

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
        <>
          <div className="overflow-x-hidden bg-background-default py-4" ref={ref}>
            {transactions.length > 1 && (
              <div className="flex gap-2 first:ml-4">
                {transactions?.map((t, index) => (
                  <div key={index} className="flex h-[622px] flex-col last-of-type:pr-4">
                    <div className="max-h-full w-[440px] overflow-y-auto rounded-lg bg-white shadow-shadow-2">
                      <Confirmation id={index} hideSignButton />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between rounded-lg bg-white px-5 pb-4 pt-3">
            <div className="flex gap-2">
              <IconButton
                size={20}
                className="flex h-[42px] w-[42px] items-center justify-center border"
                name="left"
                onClick={previousTx}
              />

              <div
                className={cnTw(
                  'h-[42px] w-[77px] rounded-full border border-divider font-semibold',
                  'flex items-center justify-center text-text-secondary',
                  'shadow-shadow-1',
                )}
              >
                {currentPage}/{transactions?.length}
              </div>

              <IconButton
                size={20}
                className="flex h-[42px] w-[42px] items-center justify-center border"
                name="right"
                onClick={nextTx}
              />
            </div>

            {initiatorWallet && basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => revokeDelegationModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )}

            <SignButton isDefault type={walletData.wallet?.type} onClick={revokeDelegationModel.events.txsConfirmed} />
          </div>
        </>
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
