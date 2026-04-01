import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { RestakeConfirmation as Confirmation } from '@/features/operations/OperationsConfirm';
import { Step } from '../lib/types';
import { restakeUtils } from '../lib/utils';
import { restakeFlow } from '../model/flow';

import { RestakeForm } from './RestakeForm';

export const Restake = () => {
  const { t } = useI18n();

  const step = useUnit(restakeFlow.$step);
  const networkStore = useUnit(restakeFlow.$networkStore);
  const initiatorWallet = useUnit(restakeFlow.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!restakeUtils.isNoneStep(step), restakeFlow.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    restakeUtils.isBasketStep(step),
    restakeFlow.output.flowFinished,
  );

  if (!networkStore) {
    return null;
  }

  if (restakeUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }
  if (restakeUtils.isBasketStep(step)) {
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
    <Modal size="md" isOpen={isModalOpen} onToggle={closeModal}>
      <Modal.Title close>
        <OperationTitle
          title={t('staking.restake.title', { asset: getNativeAsset(networkStore.chain.assets)!.symbol })}
          chainId={networkStore.chain.chainId}
        />
      </Modal.Title>
      <Modal.Content>
        {restakeUtils.isInitStep(step) && <RestakeForm onGoBack={closeModal} />}
        {restakeUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => restakeFlow.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => restakeFlow.events.stepChanged(Step.INIT)}
          />
        )}
        {restakeUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => restakeFlow.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
