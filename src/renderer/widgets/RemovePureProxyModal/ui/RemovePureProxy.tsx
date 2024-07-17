import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@app/providers';

import type { Chain } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, Button } from '@shared/ui';

import { OperationTitle } from '@entities/chain';
import { OperationResult } from '@entities/transaction';

import { OperationSign, OperationSubmit } from '@features/operations';
import { RemovePureProxiedConfirm as Confirmation, basketUtils } from '@features/operations/OperationsConfirm';

import { removePureProxyUtils } from '../lib/remove-pure-proxy-utils';
import { Step } from '../lib/types';
import { removePureProxyModel } from '../model/remove-pure-proxy-model';

import { RemovePureProxyForm } from './RemovePureProxyForm';
import { Warning } from './Warning';

export const RemovePureProxy = () => {
  const { t } = useI18n();

  const step = useUnit(removePureProxyModel.$step);
  const chain = useUnit(removePureProxyModel.$chain);
  const shouldRemovePureProxy = useUnit(removePureProxyModel.$shouldRemovePureProxy);
  const initiatorWallet = useUnit(removePureProxyModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(
    !removePureProxyUtils.isNoneStep(step),
    removePureProxyModel.output.flowFinished,
  );

  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    removePureProxyUtils.isBasketStep(step),
    removePureProxyModel.output.flowFinished,
  );

  useEffect(() => {
    if (removePureProxyUtils.isBasketStep(step)) {
      const timer = setTimeout(() => closeBasketModal(), 1450);

      return () => clearTimeout(timer);
    }
  }, [step]);

  const getModalTitle = (step: Step, chain?: Chain) => {
    if (removePureProxyUtils.isInitStep(step) || !chain) {
      return t(shouldRemovePureProxy ? 'operations.modalTitles.removePureProxy' : 'operations.modalTitles.removeProxy');
    }

    return (
      <OperationTitle
        title={t(
          shouldRemovePureProxy ? 'operations.modalTitles.removePureProxyOn' : 'operations.modalTitles.removeProxyOn',
        )}
        chainId={chain.chainId}
      />
    );
  };

  if (removePureProxyUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  if (removePureProxyUtils.isBasketStep(step)) {
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
    <BaseModal closeButton contentClass="" isOpen={isModalOpen} title={getModalTitle(step, chain)} onClose={closeModal}>
      {removePureProxyUtils.isWarningStep(step) && <Warning onGoBack={closeModal} />}
      {removePureProxyUtils.isInitStep(step) && <RemovePureProxyForm onGoBack={closeModal} />}
      {removePureProxyUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => removePureProxyModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => removePureProxyModel.events.wentBackFromConfirm()}
        />
      )}
      {removePureProxyUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => removePureProxyModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
