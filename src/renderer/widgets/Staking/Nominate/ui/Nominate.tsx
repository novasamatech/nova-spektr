import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { useModalClose } from '@/shared/lib/hooks';
import { BaseModal, Button } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { NominateConfirmation as Confirmation, basketUtils } from '@/features/operations/OperationsConfirm';
import { Validators } from '@/features/staking';
import { nominateUtils } from '../lib/nominate-utils';
import { Step } from '../lib/types';
import { nominateModel } from '../model/nominate-model';

import { NominateForm } from './NominateForm';

export const Nominate = () => {
  const { t } = useI18n();

  const step = useUnit(nominateModel.$step);
  const walletData = useUnit(nominateModel.$walletData);
  const initiatorWallet = useUnit(nominateModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!nominateUtils.isNoneStep(step), nominateModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    nominateUtils.isBasketStep(step),
    nominateModel.output.flowFinished,
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
    <BaseModal
      closeButton
      contentClass=""
      panelClass="w-fit"
      isOpen={isModalOpen}
      title={<OperationTitle title={t('staking.validators.title')} chainId={walletData.chain.chainId} />}
      onClose={closeModal}
    >
      {nominateUtils.isInitStep(step) && <NominateForm onGoBack={closeModal} />}
      {nominateUtils.isValidatorsStep(step) && (
        <Validators onGoBack={() => nominateModel.events.stepChanged(Step.INIT)} />
      )}
      {nominateUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => nominateModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => nominateModel.events.stepChanged(Step.VALIDATORS)}
        />
      )}
      {nominateUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => nominateModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
