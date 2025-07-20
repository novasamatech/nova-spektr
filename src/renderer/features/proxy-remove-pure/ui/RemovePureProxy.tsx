import { useGate, useUnit } from 'effector-react';

import { type ChainId, type Wallet } from '@/shared/core';
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
import { removePureProxyModel } from '../model/remove-pure-proxy-model';

import { RemovePureProxyForm } from './RemovePureProxyForm';
import { Warning } from './Warning';

type Props = {
  wallet: Wallet;
};

export const RemovePureProxy = ({ wallet }: Props) => {
  useGate(removePureProxyModel.flow, { wallet });

  const { t } = useI18n();

  const step = useUnit(removePureProxyModel.$step);
  const chainId = useUnit(removePureProxyModel.$proxiedAccount.map((account) => account?.chainId ?? null));
  const initiatorWallet = useUnit(removePureProxyModel.$wallet);
  const isPureProxiedNeedToBeKilled = useUnit(removePureProxyModel.$isPureProxiedNeedToBeKilled);

  const [isModalOpen, closeModal] = useModalClose(
    !removePureProxyUtils.isNoneStep(step),
    removePureProxyModel.flowFinished,
  );

  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    removePureProxyUtils.isBasketStep(step),
    removePureProxyModel.flowFinished,
  );

  const getModalTitle = (step: Step, chainId: ChainId | null) => {
    if (removePureProxyUtils.isInitStep(step) || !chainId) {
      return t(
        isPureProxiedNeedToBeKilled ? 'operations.modalTitles.removePureProxy' : 'operations.modalTitles.removeProxy',
      );
    }

    return (
      <OperationTitle
        title={t(
          isPureProxiedNeedToBeKilled
            ? 'operations.modalTitles.removePureProxyOn'
            : 'operations.modalTitles.removeProxyOn',
        )}
        chainId={chainId}
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
        autoCloseTimeout={2000}
        onClose={closeBasketModal}
      />
    );
  }

  return (
    <Modal isOpen={isModalOpen} size="md" onToggle={closeModal}>
      {removePureProxyUtils.isWarningStep(step) && !isPureProxiedNeedToBeKilled ? null : (
        <Modal.Title close>{getModalTitle(step, chainId)}</Modal.Title>
      )}
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
            onGoBack={removePureProxyModel.wentBackFromConfirm}
          />
        )}
        {removePureProxyUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => removePureProxyModel.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
