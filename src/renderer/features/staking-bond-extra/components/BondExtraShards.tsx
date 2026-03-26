import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { BondExtraConfirmation as Confirmation } from '@/features/operations/OperationsConfirm';
import { Step } from '../lib/types';
import { bondExtraUtils } from '../lib/utils';
import { bondExtraFlowShards } from '../model/flow-shards';

import { BondFormShards } from './BondFormShards';

export const BondExtraShards = () => {
  const { t } = useI18n();

  const step = useUnit(bondExtraFlowShards.$step);
  const walletData = useUnit(bondExtraFlowShards.$walletData);
  const initiatorWallet = useUnit(bondExtraFlowShards.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(
    !bondExtraUtils.isNoneStep(step),
    bondExtraFlowShards.output.flowFinished,
  );
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    bondExtraUtils.isBasketStep(step),
    bondExtraFlowShards.output.flowFinished,
  );

  if (!walletData) {
    return null;
  }

  if (bondExtraUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }
  if (bondExtraUtils.isBasketStep(step)) {
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
      <Modal.Title close>
        <OperationTitle
          title={t('staking.stakeMore.title', { asset: walletData.chain.assets[0]!.symbol })}
          chainId={walletData.chain.chainId}
        />
      </Modal.Title>
      <Modal.Content>
        {bondExtraUtils.isInitStep(step) && <BondFormShards onGoBack={closeModal} />}
        {bondExtraUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => bondExtraFlowShards.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => bondExtraFlowShards.events.stepChanged(Step.INIT)}
          />
        )}
        {bondExtraUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => bondExtraFlowShards.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
