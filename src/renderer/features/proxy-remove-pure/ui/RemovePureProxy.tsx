import { useGate, useUnit } from 'effector-react';

import { type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { RemovePureProxiedConfirmation as Confirmation } from '@/features/operations/OperationsConfirm/RemovePureProxied';
import { removePureProxyUtils } from '../lib/remove-pure-proxy-utils';
import { Step } from '../lib/types';
import { formModel } from '../model/form-model';
import { removePureProxyModel } from '../model/remove-pure-proxy-model';

import { RemovePureProxyForm } from './RemovePureProxyForm';
import { Warning } from './Warning';

type Props = {
  wallet: Wallet;
};

export const RemovePureProxy = ({ wallet }: Props) => {
  useGate(formModel.flow, { wallet });

  const { t } = useI18n();

  const step = useUnit(removePureProxyModel.$step);
  const chain = useUnit(removePureProxyModel.$chain);
  const initiatorWallet = useUnit(removePureProxyModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(
    !removePureProxyUtils.isNoneStep(step),
    removePureProxyModel.flowFinished,
  );

  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    removePureProxyUtils.isBasketStep(step),
    removePureProxyModel.flowFinished,
  );

  const getModalTitle = (step: Step, chain: Chain | null) => {
    if (removePureProxyUtils.isInitStep(step) || !chain) {
      return t('operations.modalTitles.removePureProxy');
    }

    return <OperationTitle title={t('operations.modalTitles.removePureProxyOn')} chainId={chain.chainId} />;
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
        autoCloseTimeout={2000}
        onClose={closeBasketModal}
      />
    );
  }

  return (
    <Modal isOpen={isModalOpen} size="md" onToggle={closeModal}>
      <Modal.Title close>{getModalTitle(step, chain)}</Modal.Title>
      <Modal.Content>
        {removePureProxyUtils.isWarningStep(step) && <Warning onGoBack={closeModal} />}
        {removePureProxyUtils.isInitStep(step) && <RemovePureProxyForm onGoBack={closeModal} />}
        {removePureProxyUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={void removePureProxyModel.txSaved}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => removePureProxyModel.wentBackFromConfirm()}
          />
        )}
        {removePureProxyUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => removePureProxyModel.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
