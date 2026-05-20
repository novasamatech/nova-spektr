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
import { Step } from '../lib/types';
import { payeeUtils } from '../lib/utils';
import { payeeFlowShards } from '../model/flow-shards';

import { PayeeFormShards } from './PayeeFormShards';

export const PayeeShards = () => {
  const { t } = useI18n();

  const step = useUnit(payeeFlowShards.$step);
  const walletData = useUnit(payeeFlowShards.$walletData);
  const initiatorWallet = useUnit(payeeFlowShards.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!payeeUtils.isNoneStep(step), payeeFlowShards.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    payeeUtils.isBasketStep(step),
    payeeFlowShards.output.flowFinished,
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
    <Modal isOpen={isModalOpen} size="mdlg" onToggle={(open: boolean) => !open && closeModal()}>
      <Modal.Title close>
        <OperationTitle
          title={t('staking.destination.title', { asset: getNativeAsset(walletData.chain.assets)!.symbol })}
          chainId={walletData.chain.chainId}
        />
      </Modal.Title>
      <Modal.Content>
        {payeeUtils.isInitStep(step) && <PayeeFormShards onGoBack={closeModal} />}
        {payeeUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => payeeFlowShards.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => payeeFlowShards.events.stepChanged(Step.INIT)}
          />
        )}
        {payeeUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => payeeFlowShards.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
