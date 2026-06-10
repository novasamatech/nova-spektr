import { useGate, useUnit } from 'effector-react';
import { type ReactNode, useCallback } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { verifyProxyUtils } from '../lib/verify-proxy-utils';
import { type VerifyProxyRef, Step, verifyProxyModel } from '../model/verify-proxy-model';

import { VerifyProxyConfirmation } from './VerifyProxyConfirmation';
import { VerifyProxyForm } from './VerifyProxyForm';

type Props = {
  wallet: Wallet;
  proxy: VerifyProxyRef;
  children?: ReactNode;
};

export const VerifyProxy = ({ wallet, proxy, children }: Props) => {
  const { t } = useI18n();

  useGate(verifyProxyModel.flow, { wallet });

  const step = useUnit(verifyProxyModel.$step);
  const activeProxyId = useUnit(verifyProxyModel.$activeProxyId);
  const chainId = useUnit(verifyProxyModel.$verifyStore.map((s) => s?.chain?.chainId ?? proxy.chainId));

  const isThisProxyFlow = activeProxyId === proxy.id && !verifyProxyUtils.isNoneStep(step);

  const [isModalOpen, closeModal] = useModalClose(isThisProxyFlow, verifyProxyModel.output.flowFinished);

  const start = useCallback(() => {
    verifyProxyModel.events.flowStarted({ wallet, proxy });
  }, [wallet, proxy]);

  const trigger = children ?? (
    <Button size="sm" pallet="primary" onClick={start}>
      {t('walletDetails.proxies.verifyViaProxy')}
    </Button>
  );

  const getModalTitle = () => {
    if (verifyProxyUtils.isInitStep(step) || !chainId) {
      return t('operations.modalTitles.verifyProxy');
    }

    return <OperationTitle title={t('operations.modalTitles.verifyProxyOn')} chainId={chainId} />;
  };

  if (isThisProxyFlow && verifyProxyUtils.isSubmitStep(step)) {
    return (
      <>
        {trigger}
        <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />
      </>
    );
  }

  return (
    <>
      {trigger}

      <Modal isOpen={isModalOpen} size="mdlg" onToggle={closeModal}>
        <Modal.Title close>{getModalTitle()}</Modal.Title>
        <Modal.Content>
          {verifyProxyUtils.isInitStep(step) && <VerifyProxyForm chainId={proxy.chainId} onGoBack={closeModal} />}

          {verifyProxyUtils.isConfirmStep(step) && (
            <VerifyProxyConfirmation onGoBack={verifyProxyModel.output.wentBackFromConfirm} />
          )}

          {verifyProxyUtils.isSignStep(step) && (
            <OperationSign onGoBack={() => verifyProxyModel.events.stepChanged(Step.CONFIRM)} />
          )}
        </Modal.Content>
      </Modal>
    </>
  );
};
