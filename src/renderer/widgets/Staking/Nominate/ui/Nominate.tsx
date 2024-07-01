import { useUnit } from 'effector-react';

import { BaseModal, Button } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { OperationSign, OperationSubmit } from '@features/operations';
import { Validators } from '@features/staking';
import { NominateForm } from './NominateForm';
import { nominateUtils } from '../lib/nominate-utils';
import { nominateModel } from '../model/nominate-model';
import { Step } from '../lib/types';
import { basketUtils, NominateConfirmation as Confirmation } from '@features/operations/OperationsConfirm';
import { OperationResult } from '@entities/transaction';

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

  if (!walletData) return null;

  if (nominateUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  if (nominateUtils.isBasketStep(step)) {
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
      panelClass="w-max"
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
