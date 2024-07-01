import { useUnit } from 'effector-react';

import { BaseModal, Button } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { OperationSign, OperationSubmit } from '@features/operations';
import { WithdrawForm } from './WithdrawForm';
import { withdrawUtils } from '../lib/withdraw-utils';
import { withdrawModel } from '../model/withdraw-model';
import { Step } from '../lib/types';
import { basketUtils, WithdrawConfirmation as Confirmation } from '@features/operations/OperationsConfirm';
import { OperationResult } from '@entities/transaction';

export const Withdraw = () => {
  const { t } = useI18n();

  const step = useUnit(withdrawModel.$step);
  const networkStore = useUnit(withdrawModel.$networkStore);
  const initiatorWallet = useUnit(withdrawModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!withdrawUtils.isNoneStep(step), withdrawModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    withdrawUtils.isBasketStep(step),
    withdrawModel.output.flowFinished,
  );

  if (!networkStore) return null;

  if (withdrawUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  if (withdrawUtils.isBasketStep(step)) {
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
      isOpen={isModalOpen}
      title={
        <OperationTitle
          title={t('staking.withdraw.title', { asset: networkStore.chain.assets[0].symbol })}
          chainId={networkStore.chain.chainId}
        />
      }
      onClose={closeModal}
    >
      {withdrawUtils.isInitStep(step) && <WithdrawForm onGoBack={closeModal} />}
      {withdrawUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => withdrawModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => withdrawModel.events.stepChanged(Step.INIT)}
        />
      )}
      {withdrawUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => withdrawModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
