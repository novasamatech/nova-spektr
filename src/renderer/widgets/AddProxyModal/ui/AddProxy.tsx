import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { BaseModal, Button } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import type { Chain } from '@shared/core';
import { OperationSign, OperationSubmit } from '@features/operations';
import { Step } from '../lib/types';
import { AddProxyForm } from './AddProxyForm';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { addProxyModel } from '../model/add-proxy-model';
import { AddProxyConfirm, basketUtils } from '@features/operations/OperationsConfirm';
import { OperationResult } from '@entities/transaction';

export const AddProxy = () => {
  const { t } = useI18n();

  const step = useUnit(addProxyModel.$step);
  const chain = useUnit(addProxyModel.$chain);
  const initiatorWallet = useUnit(addProxyModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!addProxyUtils.isNoneStep(step), addProxyModel.output.flowClosed);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    addProxyUtils.isBasketStep(step),
    addProxyModel.output.flowClosed,
  );

  useEffect(() => {
    if (addProxyUtils.isBasketStep(step)) {
      const timer = setTimeout(() => closeBasketModal(), 1450);

      return () => clearTimeout(timer);
    }
  }, [step]);

  const getModalTitle = (step: Step, chain?: Chain) => {
    if (addProxyUtils.isInitStep(step) || !chain) return t('operations.modalTitles.addProxy');

    return <OperationTitle title={t('operations.modalTitles.addProxyOn')} chainId={chain.chainId} />;
  };

  if (addProxyUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  if (addProxyUtils.isBasketStep(step)) {
    return (
      <OperationResult
        isOpen={isBasketModalOpen}
        variant="success"
        title={t('operation.addedToBasket')}
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
