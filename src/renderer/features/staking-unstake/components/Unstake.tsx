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
import { UnstakeConfirmation as Confirmation } from '@/features/operations/OperationsConfirm';
import { Step } from '../lib/types';
import { unstakeUtils } from '../lib/utils';
import { unstakeFlow } from '../model/flow';

import { UnstakeForm } from './UnstakeForm';

export const Unstake = () => {
  const { t } = useI18n();

  const step = useUnit(unstakeFlow.$step);
  const networkStore = useUnit(unstakeFlow.$networkStore);
  const initiatorWallet = useUnit(unstakeFlow.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!unstakeUtils.isNoneStep(step), unstakeFlow.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    unstakeUtils.isBasketStep(step),
    unstakeFlow.output.flowFinished,
  );

  if (!networkStore) {
    return null;
  }

  if (unstakeUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }
  if (unstakeUtils.isBasketStep(step)) {
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
          title={t('staking.unstake.title', { asset: getNativeAsset(networkStore.chain.assets)!.symbol })}
          chainId={networkStore.chain.chainId}
        />
      </Modal.Title>
      <Modal.Content>
        {unstakeUtils.isInitStep(step) && <UnstakeForm onGoBack={closeModal} />}
        {unstakeUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => unstakeFlow.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => unstakeFlow.events.stepChanged(Step.INIT)}
          />
        )}
        {unstakeUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => unstakeFlow.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
