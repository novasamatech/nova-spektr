import { useUnit } from 'effector-react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import type { Chain } from '@shared/core';
import { Step } from '../lib/types';
import { TransferForm } from './TransferForm';
import { Confirmation } from './Confirmation';
import { SignTransfer } from './SignTransfer';
import { SubmitTransfer } from './SubmitTransfer';
import { transferUtils } from '../lib/transfer-utils';
import { transferModel } from '../model/transfer-model';

export const TransferAssets = () => {
  const { t } = useI18n();

  const step = useUnit(transferModel.$step);
  const chain = useUnit(transferModel.$chain);

  const [isModalOpen, closeModal] = useModalClose(!transferUtils.isNoneStep(step), transferModel.outputs.flowFinished);

  const getModalTitle = (step: Step, chain?: Chain) => {
    if (transferUtils.isInitStep(step) || !chain) return t('operations.modalTitles.addProxy');

    return <OperationTitle title={t('operations.modalTitles.addProxyOn')} chainId={chain.chainId} />;
  };

  if (transferUtils.isSubmitStep(step)) return <SubmitTransfer isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal closeButton contentClass="" isOpen={isModalOpen} title={getModalTitle(step, chain)} onClose={closeModal}>
      {transferUtils.isInitStep(step) && <TransferForm onGoBack={closeModal} />}
      {transferUtils.isConfirmStep(step) && (
        <Confirmation onGoBack={() => transferModel.events.stepChanged(Step.INIT)} />
      )}
      {transferUtils.isSignStep(step) && <SignTransfer onGoBack={() => transferModel.events.stepChanged(Step.CONFIRM)} />}
    </BaseModal>
  );
};
