import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { getNativeAsset } from '@/shared/lib/utils';
import { BaseModal, Button } from '@/shared/ui';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { WithdrawConfirmation as Confirmation } from '@/features/operations/OperationsConfirm';
import { Step } from '../lib/types';
import { withdrawUtils } from '../lib/utils';
import { withdrawFlowShards } from '../model/flow-shards';

import { WithdrawFormShards } from './WithdrawFormShards';

export const WithdrawShards = () => {
  const { t } = useI18n();

  const step = useUnit(withdrawFlowShards.$step);
  const networkStore = useUnit(withdrawFlowShards.$networkStore);
  const initiatorWallet = useUnit(withdrawFlowShards.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(
    !withdrawUtils.isNoneStep(step),
    withdrawFlowShards.output.flowFinished,
  );
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    withdrawUtils.isBasketStep(step),
    withdrawFlowShards.output.flowFinished,
  );

  if (!networkStore) {
    return null;
  }

  if (withdrawUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }
  if (withdrawUtils.isBasketStep(step)) {
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
      isOpen={isModalOpen}
      title={
        <OperationTitle
          title={t('staking.withdraw.title', { asset: getNativeAsset(networkStore.chain.assets)!.symbol })}
          chainId={networkStore.chain.chainId}
        />
      }
      onClose={closeModal}
    >
      {withdrawUtils.isInitStep(step) && <WithdrawFormShards onGoBack={closeModal} />}
      {withdrawUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => withdrawFlowShards.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => withdrawFlowShards.events.stepChanged(Step.INIT)}
        />
      )}
      {withdrawUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => withdrawFlowShards.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
