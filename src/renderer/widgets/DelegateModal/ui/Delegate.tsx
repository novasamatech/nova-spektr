import { useUnit } from 'effector-react';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@app/providers';
import { Step, cnTw, isStep } from '@/shared/lib/utils';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, Button, IconButton } from '@shared/ui';
import { SignButton } from '@/entities/operations';
import { OperationTitle } from '@entities/chain';
import { OperationResult } from '@entities/transaction';
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

  const [currentTx, setCurrentTx] = useState(0);

  const ref = useRef<HTMLDivElement>(null);

  const scroll = (value: number) => {
    setTimeout(() =>
      // @ts-expect-error TS doesn't recognize offsetLeft
      ref.current?.scrollTo({ left: ref.current?.childNodes[0].childNodes[value].offsetLeft - 16, behavior: 'smooth' }),
    );
  };

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), delegateModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    isStep(step, Step.BASKET),
    delegateModel.output.flowFinished,
  );

  useEffect(() => {
    if (isStep(step, Step.BASKET)) {
      const timer = setTimeout(() => closeBasketModal(), 1450);

      return () => clearTimeout(timer);
    }
  }, [step]);

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
      contentClass=""
      panelClass="w-max"
      panelStyle={
        // Change panel class doesn't work
        {
          ...(isStep(step, Step.CONFIRM) && {
            //eslint-disable-next-line i18next/no-literal-string
            width: `478px`,
          }),
        }
      }
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
              <Button pallet="secondary" onClick={() => delegateModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )}

            <SignButton isDefault type={walletData.wallet?.type} onClick={delegateModel.events.txsConfirmed} />
          </div>
        </>
      )}

      {isStep(step, Step.SIGN) && <OperationSign onGoBack={() => delegateModel.events.stepChanged(Step.CONFIRM)} />}
    </BaseModal>
  );
};
