import { useUnit } from 'effector-react';
import { type ReactNode, useEffect } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Address, type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { TransferConfirm } from '@/features/operations/OperationsConfirm';
import { transferUtils } from '../lib/transfer-utils';
import { Step } from '../lib/types';
import { formModel } from '../model/form-model';
import { transferModel } from '../model/transfer-model';

import { TransferForm } from './TransferForm';

type Props = {
  chain: Chain;
  asset?: Asset;
  destination?: Address;
  xcm?: boolean;
  onClose?: () => void;
};

export const Transfer = ({ chain, asset, destination, xcm, onClose }: Props) => {
  const { t } = useI18n();

  const step = useUnit(transferModel.$step);
  const xcmChain = useUnit(transferModel.$xcmChain);
  const initiatorWallet = useUnit(transferModel.$initiatorWallet);
  const currentNetwork = useUnit(formModel.$networkStore);

  const [isModalOpen, closeModal] = useModalClose(!transferUtils.isNoneStep(step), transferModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    transferUtils.isBasketStep(step),
    transferModel.output.flowFinished,
  );

  useEffect(() => {
    transferModel.events.flowStarted({ chain, asset, destination, xcm });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line effector/no-watch
    return transferModel.output.flowFinished.watch(() => {
      onClose?.();
    });
  }, [onClose]);

  if (transferUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  if (transferUtils.isBasketStep(step)) {
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

  const displayChain = currentNetwork?.chain ?? chain;
  const displayAsset = currentNetwork?.asset ?? asset ?? getNativeAsset(chain.assets)!;

  const getModalTitle = (): string | ReactNode => {
    const operationTitle = xcmChain ? 'transfer.xcmTitle' : 'transfer.title';

    return (
      <OperationTitle title={`${t(operationTitle, { asset: displayAsset.symbol })}`} chainId={displayChain.chainId} />
    );
  };

  return (
    <Modal size="md" isOpen={isModalOpen} testId={TEST_IDS.TRANSFER.MODAL} onToggle={closeModal}>
      <Modal.Title close>{getModalTitle()}</Modal.Title>
      <Modal.Content>
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
      </Modal.Content>
    </Modal>
  );
};
