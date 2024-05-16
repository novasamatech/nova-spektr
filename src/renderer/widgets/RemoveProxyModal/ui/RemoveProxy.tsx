import { useUnit } from 'effector-react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import type { Chain } from '@shared/core';
import { Step } from '../lib/types';
import { RemoveProxyForm } from './RemoveProxyForm';
import { Confirmation } from './Confirm';
import { removeProxyUtils } from '../lib/remove-proxy-utils';
import { removeProxyModel } from '../model/remove-proxy-model';
import { OperationSign, OperationSubmit } from '@features/operations';
import { AddToBasketButton } from '@features/operations/OperationsConfirm';

export const RemoveProxy = () => {
  const { t } = useI18n();

  const step = useUnit(removeProxyModel.$step);
  const chain = useUnit(removeProxyModel.$chain);
  const initiatorWallet = useUnit(removeProxyModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(
    !removeProxyUtils.isNoneStep(step),
    removeProxyModel.output.flowFinished,
  );

  const getModalTitle = (step: Step, chain?: Chain) => {
    if (removeProxyUtils.isInitStep(step) || !chain) return t('operations.modalTitles.removeProxy');

    return <OperationTitle title={t('operations.modalTitles.removeProxyOn')} chainId={chain.chainId} />;
  };

  if (removeProxyUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal closeButton contentClass="" isOpen={isModalOpen} title={getModalTitle(step, chain)} onClose={closeModal}>
      {removeProxyUtils.isInitStep(step) && <RemoveProxyForm onGoBack={closeModal} />}
      {removeProxyUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            <AddToBasketButton wallet={initiatorWallet} onTxSaved={() => removeProxyModel.events.txSaved()} />
          }
          onGoBack={() => removeProxyModel.events.wentBackFromConfirm()}
        />
      )}
      {removeProxyUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => removeProxyModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
