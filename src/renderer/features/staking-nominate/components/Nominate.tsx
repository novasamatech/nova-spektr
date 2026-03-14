import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { basketUtils } from '@/entities/basket';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { NominateConfirmation as Confirmation } from '@/features/operations/OperationsConfirm';
import { Validators } from '@/features/staking';
import { Step } from '../lib/types';
import { nominateUtils } from '../lib/utils';
import { nominateFlow } from '../model/flow';

import { NominateForm } from './NominateForm';

export const Nominate = () => {
  const { t } = useI18n();

  const step = useUnit(nominateFlow.$step);
  const walletData = useUnit(nominateFlow.$walletData);
  const initiatorWallet = useUnit(nominateFlow.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!nominateUtils.isNoneStep(step), nominateFlow.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    nominateUtils.isBasketStep(step),
    nominateFlow.output.flowFinished,
  );

  if (!walletData) {
    return null;
  }

  if (nominateUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }
  if (nominateUtils.isBasketStep(step)) {
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
    <Modal size={nominateUtils.isValidatorsStep(step) ? 'fit' : 'md'} isOpen={isModalOpen} onToggle={closeModal}>
      <Modal.Title close>
        {<OperationTitle title={t('staking.validators.title')} chainId={walletData.chain.chainId} />}
      </Modal.Title>
      <Modal.Content>
        {nominateUtils.isInitStep(step) && <NominateForm onGoBack={closeModal} />}
        {nominateUtils.isValidatorsStep(step) && (
          <Validators onGoBack={() => nominateFlow.events.stepChanged(Step.INIT)} />
        )}
        {nominateUtils.isConfirmStep(step) && (
          <Confirmation
            secondaryActionButton={
              initiatorWallet &&
              basketUtils.isBasketAvailable(initiatorWallet) && (
                <Button pallet="secondary" onClick={() => nominateFlow.events.txSaved()}>
                  {t('operation.addToBasket')}
                </Button>
              )
            }
            onGoBack={() => nominateFlow.events.stepChanged(Step.VALIDATORS)}
          />
        )}
        {nominateUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => nominateFlow.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
