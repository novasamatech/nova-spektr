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
import { WithdrawConfirmation as Confirmation } from '@/features/operations/OperationsConfirm';
import { Step } from '../lib/types';
import { withdrawUtils } from '../lib/utils';
import { withdrawFlow } from '../model/flow';

import { WithdrawForm } from './WithdrawForm';

export const Withdraw = () => {
  const { t } = useI18n();

  const step = useUnit(withdrawFlow.$step);
  const networkStore = useUnit(withdrawFlow.$networkStore);
  const initiatorWallet = useUnit(withdrawFlow.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!withdrawUtils.isNoneStep(step), withdrawFlow.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    withdrawUtils.isBasketStep(step),
    withdrawFlow.output.flowFinished,
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
    <Modal isOpen={isModalOpen} size="mdlg" onToggle={(open) => !open && closeModal()}>
      <Modal.Title close>
        <OperationTitle
          title={t('staking.withdraw.title', { asset: getNativeAsset(networkStore.chain.assets)!.symbol })}
          chainId={networkStore.chain.chainId}
        />
      </Modal.Title>
      <Modal.Content>
        {withdrawUtils.isInitStep(step) && <WithdrawForm onGoBack={closeModal} />}
        {withdrawUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => withdrawFlow.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => withdrawFlow.events.stepChanged(Step.INIT)}
          />
        )}
        {withdrawUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => withdrawFlow.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
