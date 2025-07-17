import { useUnit } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { walletSelect } from '@/aggregates/wallet-select';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { BondExtraConfirmation as Confirmation } from '@/features/operations/OperationsConfirm';
import { callDataFormModel } from '..';
import { Step } from '../lib/types';
import { callDataUtils } from '../lib/utils';
import { callDataModel } from '../model/call-data';
import { formModel } from '../model/form-model';

import { Form } from './Form';

interface CallDataContentProps {
  step: Step;
  initiatorWallet: Wallet | null;
  closeModal: () => void;
  t: (key: string) => string;
}

const CallDataContent = ({ step, initiatorWallet, closeModal, t }: CallDataContentProps) => {
  return (
    <Modal.Content>
      {callDataUtils.isInitStep(step) && <Form onGoBack={closeModal} />}
      {callDataUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => formModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => formModel.events.stepChanged(Step.INIT)}
        />
      )}
      {callDataUtils.isSignStep(step) && <OperationSign onGoBack={() => formModel.events.stepChanged(Step.CONFIRM)} />}
    </Modal.Content>
  );
};

export const CallData = () => {
  const { t } = useI18n();

  const step = useUnit(formModel.$step);
  const initiatorWallet = useUnit(formModel.$initiatorWallet);
  const selectedChainId = useUnit(callDataModel.$selectedChainId);

  const wallet = useUnit(walletSelect.$selectedWallet);
  const selectedAccounts = useUnit(walletSelect.$selectedAccounts);

  const onToggle = (open: boolean) => {
    if (open && wallet && selectedAccounts.length > 0) {
      callDataFormModel.events.flowStarted({
        wallet,
        initiator: selectedAccounts[0],
      });
    }
    if (!open) {
      callDataFormModel.events.flowFinished();
    }
  };

  const onGoBack = () => {
    formModel.events.flowFinished();
  };

  const [isModalOpen, closeModal] = useModalClose(!callDataUtils.isNoneStep(step), onGoBack);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    callDataUtils.isBasketStep(step),
    formModel.output.flowFinished,
  );

  if (callDataUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }
  if (callDataUtils.isBasketStep(step)) {
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

  return (
    <Modal isOpen={isModalOpen} size="fit" height="fit" onToggle={onToggle}>
      <Modal.Trigger>
        <Button>{t('callData.title')}</Button>
      </Modal.Trigger>

      <Modal.Title close>
        <OperationTitle title={t('callData.title')} chainId={selectedChainId} />
      </Modal.Title>
      <CallDataContent step={step} initiatorWallet={initiatorWallet} closeModal={closeModal} t={t} />
    </Modal>
  );
};
