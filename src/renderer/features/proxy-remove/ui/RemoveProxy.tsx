import { useGate, useUnit } from 'effector-react';

import { type ChainId, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult, transactionService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { InitiateDraftButton } from '@/features/drafts';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { RemoveProxyConfirmation as Confirmation } from '@/features/operations/OperationsConfirm/RemoveProxy';
import { removeProxyUtils } from '../lib/remove-proxy-utils';
import { Step } from '../lib/types';
import { removeProxyModel } from '../model/remove-proxy-model';

import { RemoveProxyForm } from './RemoveProxyForm';
import { Warning } from './Warning';

type Props = {
  wallet: Wallet;
};

export const RemoveProxy = ({ wallet }: Props) => {
  useGate(removeProxyModel.flow, { wallet });

  const { t } = useI18n();

  const step = useUnit(removeProxyModel.$step);
  const chainId = useUnit(removeProxyModel.$proxyAccount.map((proxy) => proxy?.chainId ?? null));

  const isPureProxiedNeedToBeKilled = useUnit(removeProxyModel.$isPureProxiedNeedToBeKilled);
  const coreTx = useUnit(removeProxyModel.$coreTx);
  const api = useUnit(removeProxyModel.$api);
  const signatoryAccount = useUnit(removeProxyModel.form.fields.signatory.$value);
  const wallets = useUnit(walletModel.$wallets);

  const draftCallData = transactionService.getCallDataHex(coreTx, api);

  const signatoryWallet = signatoryAccount ? (wallets.find((w) => w.id === signatoryAccount.walletId) ?? null) : null;
  const isBasketAvailable = signatoryWallet ? basketUtils.isBasketAvailable(signatoryWallet) : false;

  const [isModalOpen, closeModal] = useModalClose(!removeProxyUtils.isNoneStep(step), removeProxyModel.flowFinished);

  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    removeProxyUtils.isBasketStep(step),
    removeProxyModel.flowFinished,
  );

  const getModalTitle = (step: Step, chainId: ChainId | null) => {
    if (removeProxyUtils.isInitStep(step) || !chainId) {
      return t(
        isPureProxiedNeedToBeKilled ? 'operations.modalTitles.removePureProxy' : 'operations.modalTitles.removeProxy',
      );
    }

    return (
      <OperationTitle
        title={t(
          isPureProxiedNeedToBeKilled
            ? 'operations.modalTitles.removePureProxyOn'
            : 'operations.modalTitles.removeProxyOn',
        )}
        chainId={chainId}
      />
    );
  };

  if (removeProxyUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  if (removeProxyUtils.isBasketStep(step)) {
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
    <Modal
      isOpen={isModalOpen}
      size={removeProxyUtils.isWarningStep(step) && !isPureProxiedNeedToBeKilled ? 'fit' : 'md'}
      onToggle={closeModal}
    >
      {removeProxyUtils.isWarningStep(step) && !isPureProxiedNeedToBeKilled ? null : (
        <Modal.Title close>{getModalTitle(step, chainId)}</Modal.Title>
      )}
      <Modal.Content>
        {removeProxyUtils.isWarningStep(step) && <Warning onGoBack={closeModal} />}
        {removeProxyUtils.isInitStep(step) && <RemoveProxyForm onGoBack={closeModal} />}
        {removeProxyUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              <>
                {isBasketAvailable && (
                  <Button pallet="secondary" onClick={() => removeProxyModel.txSaved()}>
                    {t('operation.addToBasket')}
                  </Button>
                )}
                <InitiateDraftButton
                  callData={draftCallData}
                  chainId={chainId}
                  source="remove-proxy"
                  onDraftCreated={closeModal}
                />
              </>
            }
            onGoBack={removeProxyModel.wentBackFromConfirm}
          />
        )}
        {removeProxyUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => removeProxyModel.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
