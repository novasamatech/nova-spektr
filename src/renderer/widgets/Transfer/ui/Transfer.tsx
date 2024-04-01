import { useUnit } from 'effector-react';
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import type { Chain, Asset } from '@shared/core';
import { Paths } from '@shared/routes';
import { OperationSign, OperationSubmit } from '@features/operations';
import { TransferForm } from './TransferForm';
import { Confirmation } from './Confirmation';
import { transferUtils } from '../lib/transfer-utils';
import { transferModel } from '../model/transfer-model';
import { Step } from '../lib/types';

type Props = {
  chain: Chain;
  asset: Asset;
};

export const Transfer = ({ chain, asset }: Props) => {
  const { t } = useI18n();

  const navigate = useNavigate();

  const step = useUnit(transferModel.$step);
  const xcmChain = useUnit(transferModel.$xcmChain);

  const [isModalOpen, closeModal] = useModalClose(!transferUtils.isNoneStep(step), () => {
    navigate(Paths.ASSETS);
    transferModel.output.flowFinished();
  });

  useEffect(() => {
    transferModel.events.flowStarted({ chain, asset });
  }, []);

  useEffect(() => {
    transferModel.events.navigateApiChanged({ navigate });
  }, []);

  if (transferUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  const getModalTitle = (chain: Chain, asset: Asset, xcmChain?: Chain): String | ReactNode => {
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
        <Confirmation onGoBack={() => transferModel.events.stepChanged(Step.INIT)} />
      )}
      {transferUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => transferModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
