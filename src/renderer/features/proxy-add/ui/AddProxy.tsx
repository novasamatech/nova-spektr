import { useGate, useUnit } from 'effector-react';

import { type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { BaseModal, Button } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { AddProxyConfirm, basketUtils } from '@/features/operations/OperationsConfirm';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { Step } from '../lib/types';
import { addProxyModel } from '../model/add-proxy-model';
import { formModel } from '../model/form-model';

import { AddProxyForm } from './AddProxyForm';

type Props = {
  wallet: Wallet | null;
};

export const AddProxy = ({ wallet }: Props) => {
  useGate(formModel.flow, { wallet });

  const { t } = useI18n();

  const step = useUnit(addProxyModel.$step);
  const chain = useUnit(addProxyModel.$chain);
  const initiatorWallet = useUnit(addProxyModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!addProxyUtils.isNoneStep(step), addProxyModel.output.flowClosed);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    addProxyUtils.isBasketStep(step),
    addProxyModel.output.flowClosed,
  );

  const getModalTitle = (step: Step, chain?: Chain) => {
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
    <BaseModal
      closeButton
      contentClass=""
      panelClass="max-h-full overflow-y-auto"
      isOpen={isModalOpen}
      title={getModalTitle(step, chain)}
      onClose={closeModal}
    >
      {addProxyUtils.isInitStep(step) && <AddProxyForm onGoBack={closeModal} />}
      {addProxyUtils.isConfirmStep(step) && (
        <AddProxyConfirm
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => addProxyModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => addProxyModel.events.stepChanged(Step.INIT)}
        />
      )}
      {addProxyUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => addProxyModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
