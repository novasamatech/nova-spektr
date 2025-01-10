import { useGate, useUnit } from 'effector-react';

import { type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { BaseModal, Button } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { RemoveProxyConfirm as Confirmation } from '@/features/operations/OperationsConfirm/RemoveProxy';
import { basketUtils } from '@/features/operations/OperationsConfirm/lib/basket-utils';
import { removeProxyUtils } from '../lib/remove-proxy-utils';
import { Step } from '../lib/types';
import { formModel } from '../model/form-model';
import { removeProxyModel } from '../model/remove-proxy-model';

import { RemoveProxyForm } from './RemoveProxyForm';

type Props = {
  wallet: Wallet;
};

export const RemoveProxy = ({ wallet }: Props) => {
  useGate(formModel.flow, { wallet });

  const { t } = useI18n();

  const step = useUnit(removeProxyModel.$step);
  const chain = useUnit(removeProxyModel.$chain);
  const initiatorWallet = useUnit(removeProxyModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(
    !removeProxyUtils.isNoneStep(step),
    removeProxyModel.output.flowFinished,
  );

  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    removeProxyUtils.isBasketStep(step),
    removeProxyModel.output.flowFinished,
  );

  const getModalTitle = (step: Step, chain?: Chain) => {
    if (removeProxyUtils.isInitStep(step) || !chain) {
      return t('operations.modalTitles.removeProxy');
    }

    return <OperationTitle title={t('operations.modalTitles.removeProxyOn')} chainId={chain.chainId} />;
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
    <BaseModal closeButton contentClass="" isOpen={isModalOpen} title={getModalTitle(step, chain)} onClose={closeModal}>
      {removeProxyUtils.isInitStep(step) && <RemoveProxyForm onGoBack={closeModal} />}
      {removeProxyUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => removeProxyModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
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
