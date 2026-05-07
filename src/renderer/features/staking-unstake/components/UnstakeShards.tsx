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
import { unstakeFlowShards } from '../model/flow-shards';

import { UnstakeFormShards } from './UnstakeFormShards';

export const UnstakeShards = () => {
  const { t } = useI18n();

  const step = useUnit(unstakeFlowShards.$step);
  const networkStore = useUnit(unstakeFlowShards.$networkStore);
  const initiatorWallet = useUnit(unstakeFlowShards.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(
    !unstakeUtils.isNoneStep(step),
    unstakeFlowShards.output.flowFinished,
  );
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    unstakeUtils.isBasketStep(step),
    unstakeFlowShards.output.flowFinished,
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
    <Modal size="mdlg" isOpen={isModalOpen} onToggle={(open) => !open && closeModal()}>
      <Modal.Title close>
        <OperationTitle
          title={t('staking.unstake.title', { asset: getNativeAsset(networkStore.chain.assets)!.symbol })}
          chainId={networkStore.chain.chainId}
        />
      </Modal.Title>
      <Modal.Content>
        {unstakeUtils.isInitStep(step) && <UnstakeFormShards onGoBack={closeModal} />}
        {unstakeUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => unstakeFlowShards.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => unstakeFlowShards.events.stepChanged(Step.INIT)}
          />
        )}
        {unstakeUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => unstakeFlowShards.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
