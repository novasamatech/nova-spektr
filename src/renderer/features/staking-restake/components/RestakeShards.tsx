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
import { restakeFlowShards } from '../model/flow-shards';

import { RestakeFormShards } from './RestakeFormShards';

export const RestakeShards = () => {
  const { t } = useI18n();

  const step = useUnit(restakeFlowShards.$step);
  const networkStore = useUnit(restakeFlowShards.$networkStore);
  const initiatorWallet = useUnit(restakeFlowShards.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(
    !restakeUtils.isNoneStep(step),
    restakeFlowShards.output.flowFinished,
  );
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    restakeUtils.isBasketStep(step),
    restakeFlowShards.output.flowFinished,
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
    <Modal size="mdlg" isOpen={isModalOpen} onToggle={(open) => !open && closeModal()}>
      <Modal.Title close>
        <OperationTitle
          title={t('staking.restake.title', { asset: getNativeAsset(networkStore.chain.assets)!.symbol })}
          chainId={networkStore.chain.chainId}
        />
      </Modal.Title>
      <Modal.Content>
        {restakeUtils.isInitStep(step) && <RestakeFormShards onGoBack={closeModal} />}
        {restakeUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => restakeFlowShards.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => restakeFlowShards.events.stepChanged(Step.INIT)}
          />
        )}
        {restakeUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => restakeFlowShards.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
