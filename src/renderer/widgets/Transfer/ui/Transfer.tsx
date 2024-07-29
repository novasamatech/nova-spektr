import { useUnit } from 'effector-react';
import { type ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useI18n } from '@app/providers';
import { type Asset, type Chain } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, Button } from '@shared/ui';
import { OperationTitle } from '@entities/chain';
import { OperationResult } from '@entities/transaction';
import { OperationSign, OperationSubmit } from '@features/operations';
import { TransferConfirm, basketUtils } from '@features/operations/OperationsConfirm';
import { transferUtils } from '../lib/transfer-utils';
import { Step } from '../lib/types';
import { transferModel } from '../model/transfer-model';

import { TransferForm } from './TransferForm';

type Props = {
  chain: Chain;
  asset: Asset;
};

export const Transfer = ({ chain, asset }: Props) => {
  const { t } = useI18n();

  const navigate = useNavigate();

  const step = useUnit(transferModel.$step);
  const xcmChain = useUnit(transferModel.$xcmChain);
  const initiatorWallet = useUnit(transferModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!transferUtils.isNoneStep(step), transferModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    transferUtils.isBasketStep(step),
    transferModel.output.flowFinished,
  );

  useEffect(() => {
    transferModel.events.flowStarted({ chain, asset });
  }, []);

  useEffect(() => {
    transferModel.events.navigateApiChanged({ navigate });
  }, []);

  useEffect(() => {
    if (transferUtils.isBasketStep(step)) {
      const timer = setTimeout(() => closeBasketModal(), 1450);

      return () => clearTimeout(timer);
    }
  }, [step]);

  if (transferUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }
  if (transferUtils.isBasketStep(step)) {
    return (
      <OperationResult
        isOpen={isBasketModalOpen}
        variant="success"
        title={t('operation.addedToBasket')}
        onClose={closeBasketModal}
      />
    );
  }

  const getModalTitle = (chain: Chain, asset: Asset, xcmChain?: Chain): string | ReactNode => {
    const operationTitle = xcmChain ? 'transfer.xcmTitle' : 'transfer.title';

    return <OperationTitle title={`${t(operationTitle, { asset: asset.symbol })}`} chainId={chain.chainId} />;
  };

  return (
    <BaseModal
      closeButton
      contentClass=""
      isOpen={isModalOpen}
      title={getModalTitle(chain, asset, xcmChain)}
      onClose={closeModal}
    >
      {transferUtils.isInitStep(step) && <TransferForm onGoBack={closeModal} />}
      {transferUtils.isConfirmStep(step) && (
        <TransferConfirm
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => transferModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => transferModel.events.stepChanged(Step.INIT)}
        />
      )}
      {transferUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => transferModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
