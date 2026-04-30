import { useUnit } from 'effector-react';
import { type PropsWithChildren, useEffect, useState } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { AddPureProxiedConfirmation } from '@/features/operations/OperationsConfirm/AddPureProxied';
import { addPureProxiedUtils } from '../lib/add-pure-proxied-utils';
import { Step } from '../lib/types';
import { addPureProxiedModel } from '../model/add-pure-proxied-model';
import { formModel } from '../model/form-model';

import { AddPureProxiedForm } from './AddPureProxiedForm';

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClose?: () => void;
}>;

export const AddPureProxied = ({ wallet, onClose, children }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const step = useUnit(addPureProxiedModel.$step);
  const {
    fields: { chain },
  } = useForm(formModel.form);
  const signatoryAccount = useUnit(formModel.form.fields.signatory.$value);
  const wallets = useUnit(walletModel.$wallets);

  const signatoryWallet = signatoryAccount ? (wallets.find(w => w.id === signatoryAccount.walletId) ?? null) : null;
  const isBasketAvailable = signatoryWallet ? basketUtils.isBasketAvailable(signatoryWallet) : false;

  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    addPureProxiedUtils.isBasketStep(step),
    addPureProxiedModel.output.flowFinished,
  );

  const closeModal = () => {
    setIsModalOpen(false);
    addPureProxiedModel.output.flowFinished();
    onClose?.();
  };

  useEffect(() => {
    if (step === Step.NONE) {
      setIsModalOpen(false);
    }
  }, [step]);

  const onToggle = (isOpen: boolean) => {
    if (isOpen) {
      setIsModalOpen(true);
      addPureProxiedModel.events.flowStarted(wallet);
      return;
    }

    closeModal();
  };

  const getModalTitle = (step: Step, chain?: Chain) => {
    if (addPureProxiedUtils.isInitStep(step) || !chain) {
      return t('operations.modalTitles.addPureProxy');
    }

    return <OperationTitle title={t('operations.modalTitles.addPureProxyOn')} chainId={chain.chainId} />;
  };

  if (addPureProxiedUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  if (addPureProxiedUtils.isBasketStep(step)) {
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
    <Modal isOpen={isModalOpen} size="md" height="fit" onToggle={onToggle}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{getModalTitle(step, chain.value ?? undefined)}</Modal.Title>
      <Modal.Content>
        {addPureProxiedUtils.isInitStep(step) && <AddPureProxiedForm />}
        {addPureProxiedUtils.isConfirmStep(step) && (
          <AddPureProxiedConfirmation
            secondaryActionButton={
              isBasketAvailable ? (
                <Button pallet="secondary" onClick={() => addPureProxiedModel.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              ) : undefined
            }
            onGoBack={() => addPureProxiedModel.events.stepChanged(Step.INIT)}
          />
        )}
        {addPureProxiedUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => addPureProxiedModel.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
