import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit/Modal/Modal';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { BondNominateConfirmation as Confirmation } from '@/features/operations/OperationsConfirm';
import { ValidatorSelectionModal } from '@/features/validator-selection';
import { Step } from '../lib/types';
import { bondNominateUtils } from '../lib/utils';
import { bondNominateFlow } from '../model/flow';

import { BondForm } from './BondForm';

export const BondNominate = () => {
  const { t } = useI18n();

  const step = useUnit(bondNominateFlow.$step);
  const walletData = useUnit(bondNominateFlow.$walletData);
  const initiatorWallet = useUnit(bondNominateFlow.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!bondNominateUtils.isNoneStep(step), bondNominateFlow.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    bondNominateUtils.isBasketStep(step),
    bondNominateFlow.flowFinished,
  );

  if (!walletData) {
    return null;
  }

  if (bondNominateUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }
  if (bondNominateUtils.isValidatorsStep(step)) {
    return (
      <ValidatorSelectionModal
        isOpen={isModalOpen}
        onGoBack={() => bondNominateFlow.stepChanged(Step.INIT)}
        onClose={closeModal}
      />
    );
  }
  if (bondNominateUtils.isBasketStep(step)) {
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
    <Modal
      isOpen={isModalOpen}
      size="mdlg"
      onToggle={(open) => {
        if (!open) {
          closeModal();
        }
      }}
    >
      <Modal.Title close>
        <OperationTitle
          title={t('staking.bond.title', { asset: walletData.chain.assets[0]!.symbol })}
          chainId={walletData.chain.chainId}
        />
      </Modal.Title>
      <Modal.Content>
        {bondNominateUtils.isInitStep(step) && <BondForm onGoBack={closeModal} />}
        {bondNominateUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet && basketUtils.isBasketAvailable(initiatorWallet) ? (
                <Button pallet="secondary" onClick={() => bondNominateFlow.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              ) : undefined
            }
            onGoBack={() => bondNominateFlow.stepChanged(Step.VALIDATORS)}
          />
        )}
        {bondNominateUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => bondNominateFlow.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
