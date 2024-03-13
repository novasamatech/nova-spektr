import { useUnit } from 'effector-react';
import { ReactNode } from 'react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { Step } from '../lib/types';
import { TransferForm } from './TransferForm';
import { Confirmation } from './Confirmation';
import { SignTransfer } from './SignTransfer';
import { SubmitTransfer } from './SubmitTransfer';
import { transferUtils } from '../lib/transfer-utils';
import { transferModel } from '../model/transfer-model';
import type { Chain, Asset } from '@shared/core';

type Props = {
  chain: Chain;
  asset: Asset;
};

export const TransferAssets = ({ asset }: Props) => {
  const { t } = useI18n();

  const step = useUnit(transferModel.$step);
  const chain = useUnit(transferModel.$chain);

  const [isModalOpen, closeModal] = useModalClose(!transferUtils.isNoneStep(step), transferModel.output.flowFinished);

  if (transferUtils.isSubmitStep(step)) return <SubmitTransfer isOpen={isModalOpen} onClose={closeModal} />;

  const getModalTitle = (chain?: Chain, asset?: Asset): String | ReactNode => {
    // TODO: refactor this trash
    if (!chain || !asset) return '';
    const operationTitle = 'transfer.title';
    //   destinationChain && destinationChain !== chain.chainId ? 'transfer.xcmTitle' : 'transfer.title';

    return <OperationTitle title={t(operationTitle)} chainId={chain.chainId} />;
  };

  return (
    <BaseModal
      closeButton
      contentClass=""
      isOpen={isModalOpen}
      title={getModalTitle(chain, asset)}
      onClose={closeModal}
    >
      {transferUtils.isInitStep(step) && <TransferForm onGoBack={closeModal} />}
      {transferUtils.isConfirmStep(step) && (
        <Confirmation onGoBack={() => transferModel.events.stepChanged(Step.INIT)} />
      )}
      {transferUtils.isSignStep(step) && (
        <SignTransfer onGoBack={() => transferModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
