import { useUnit } from 'effector-react';
import { type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { AddProxyConfirmation } from '@/features/operations/OperationsConfirm/AddProxy';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { Step } from '../lib/types';
import { addProxyModel } from '../model/add-proxy-model';
import { formModel } from '../model/form-model';

import { AddProxyForm } from './AddProxyForm';

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClose?: () => void;
  launchOpen?: boolean;
  hideTrigger?: boolean;
}>;

export const AddProxy = ({ wallet, onClose, children, launchOpen, hideTrigger }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  const hasStartedRef = useRef(false);
  const hasClosedRef = useRef(false);

  useEffect(() => {
    if (!launchOpen) return;

    hasClosedRef.current = false;
    setIsModalOpen(true);
    addProxyModel.events.flowStarted(walletRef.current);
  }, [launchOpen, wallet.id]);

  const step = useUnit(addProxyModel.$step);
  const chain = useUnit(addProxyModel.$chain);
  const signatoryAccount = useUnit(formModel.form.fields.signatory.$value);
  const wallets = useUnit(walletModel.$wallets);

  const signatoryWallet = signatoryAccount ? (wallets.find((w) => w.id === signatoryAccount.walletId) ?? null) : null;
  const isBasketAvailable = signatoryWallet ? basketUtils.isBasketAvailable(signatoryWallet) : false;

  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    addProxyUtils.isBasketStep(step),
    addProxyModel.output.flowClosed,
  );

  const closeModal = () => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    hasStartedRef.current = false;
    setIsModalOpen(false);
    addProxyModel.output.flowClosed();
    onClose?.();
  };

  useEffect(() => {
    if (step !== Step.NONE) {
      hasStartedRef.current = true;
      return;
    }

    if (!hasStartedRef.current) return;

    hasStartedRef.current = false;
    setIsModalOpen(false);
    if (launchOpen && !hasClosedRef.current) {
      hasClosedRef.current = true;
      onClose?.();
    }
  }, [step]);

  const onToggle = (isOpen: boolean) => {
    if (isOpen) {
      hasClosedRef.current = false;
      setIsModalOpen(true);
      addProxyModel.events.flowStarted(wallet);
      return;
    }

    closeModal();
  };

  const getModalTitle = (step: Step, chain: Chain | null) => {
    if (addProxyUtils.isInitStep(step) || !chain) {
      return t('operations.modalTitles.addProxy');
    }

    return <OperationTitle title={t('operations.modalTitles.addProxyOn')} chainId={chain.chainId} />;
  };

  if (addProxyUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  if (addProxyUtils.isBasketStep(step)) {
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
    <Modal size="mdlg" height="fit" isOpen={isModalOpen} onToggle={onToggle}>
      {!hideTrigger && <Modal.Trigger>{children}</Modal.Trigger>}
      <Modal.Title close>{getModalTitle(step, chain)}</Modal.Title>
      <Modal.Content>
        {addProxyUtils.isInitStep(step) && <AddProxyForm />}
        {addProxyUtils.isConfirmStep(step) && (
          <AddProxyConfirmation
            secondaryActionButton={
              isBasketAvailable ? (
                <Button pallet="secondary" onClick={() => addProxyModel.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              ) : undefined
            }
            onGoBack={() => addProxyModel.events.stepChanged(Step.INIT)}
          />
        )}
        {addProxyUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => addProxyModel.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
