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
import { PayeeConfirmation as Confirmation } from '@/features/operations/OperationsConfirm';
import { payeeUtils } from '../lib/payee-utils';
import { Step } from '../lib/types';
import { payeeModel } from '../model/payee-model';

import { PayeeForm } from './PayeeForm';

export const Payee = () => {
  const { t } = useI18n();

  const step = useUnit(payeeModel.$step);
  const walletData = useUnit(payeeModel.$walletData);
  const initiatorWallet = useUnit(payeeModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!payeeUtils.isNoneStep(step), payeeModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    payeeUtils.isBasketStep(step),
    payeeModel.output.flowFinished,
  );

  if (!walletData) {
    return null;
  }

  if (payeeUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }
  if (payeeUtils.isBasketStep(step)) {
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
    <Modal isOpen={isModalOpen} size="md" onToggle={(open: boolean) => !open && closeModal()}>
      <Modal.Title close>
        <OperationTitle
          title={t('staking.destination.title', { asset: getNativeAsset(walletData.chain.assets)!.symbol })}
          chainId={walletData.chain.chainId}
        />
      </Modal.Title>
      <Modal.Content>
        {payeeUtils.isInitStep(step) && <PayeeForm onGoBack={closeModal} />}
        {payeeUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => payeeModel.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => payeeModel.events.stepChanged(Step.INIT)}
          />
        )}
        {payeeUtils.isSignStep(step) && <OperationSign onGoBack={() => payeeModel.events.stepChanged(Step.CONFIRM)} />}
      </Modal.Content>
    </Modal>
  );
};
