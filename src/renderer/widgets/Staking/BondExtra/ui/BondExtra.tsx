import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { useModalClose } from '@/shared/lib/hooks';
import { BaseModal, Button } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { BondExtraConfirmation as Confirmation, basketUtils } from '@/features/operations/OperationsConfirm';
import { bondExtraUtils } from '../lib/bond-extra-utils';
import { Step } from '../lib/types';
import { bondExtraModel } from '../model/bond-extra-model';

import { BondForm } from './BondForm';

export const BondExtra = () => {
  const { t } = useI18n();

  const step = useUnit(bondExtraModel.$step);
  const walletData = useUnit(bondExtraModel.$walletData);
  const initiatorWallet = useUnit(bondExtraModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!bondExtraUtils.isNoneStep(step), bondExtraModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    bondExtraUtils.isBasketStep(step),
    bondExtraModel.output.flowFinished,
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
    <BaseModal
      closeButton
      contentClass=""
      isOpen={isModalOpen}
      title={
        <OperationTitle
          title={t('staking.stakeMore.title', { asset: walletData.chain.assets[0].symbol })}
          chainId={walletData.chain.chainId}
        />
      }
      onClose={closeModal}
    >
      {bondExtraUtils.isInitStep(step) && <BondForm onGoBack={closeModal} />}
      {bondExtraUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => bondExtraModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => bondExtraModel.events.stepChanged(Step.INIT)}
        />
      )}
      {bondExtraUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => bondExtraModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
