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
import { bondExtraFlow } from '../model/flow';

import { BondForm } from './BondForm';

export const BondExtra = () => {
  const { t } = useI18n();

  const step = useUnit(bondExtraFlow.$step);
  const walletData = useUnit(bondExtraFlow.$walletData);
  const initiatorWallet = useUnit(bondExtraFlow.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!bondExtraUtils.isNoneStep(step), bondExtraFlow.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    bondExtraUtils.isBasketStep(step),
    bondExtraFlow.output.flowFinished,
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
    <Modal isOpen={isModalOpen} size="mdlg" onToggle={closeModal}>
      <Modal.Title close>
        <OperationTitle
          title={t('staking.stakeMore.title', { asset: walletData.chain.assets[0]!.symbol })}
          chainId={walletData.chain.chainId}
        />
      </Modal.Title>
      <Modal.Content>
        {bondExtraUtils.isInitStep(step) && <BondForm onGoBack={closeModal} />}
        {bondExtraUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => bondExtraFlow.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => bondExtraFlow.events.stepChanged(Step.INIT)}
          />
        )}
        {bondExtraUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => bondExtraFlow.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
