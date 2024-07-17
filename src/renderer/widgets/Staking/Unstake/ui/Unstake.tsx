import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { BaseModal, Button } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { OperationSign, OperationSubmit } from '@features/operations';
import { UnstakeForm } from './UnstakeForm';
import { unstakeUtils } from '../lib/unstake-utils';
import { unstakeModel } from '../model/unstake-model';
import { Step } from '../lib/types';
import { UnstakeConfirmation as Confirmation, basketUtils } from '@features/operations/OperationsConfirm';
import { OperationResult } from '@entities/transaction';

export const Unstake = () => {
  const { t } = useI18n();

  const step = useUnit(unstakeModel.$step);
  const networkStore = useUnit(unstakeModel.$networkStore);
  const initiatorWallet = useUnit(unstakeModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!unstakeUtils.isNoneStep(step), unstakeModel.output.flowFinished);
  const [isBasketModalOpen, closeBasketModal] = useModalClose(
    unstakeUtils.isBasketStep(step),
    unstakeModel.output.flowFinished,
  );

  useEffect(() => {
    if (unstakeUtils.isBasketStep(step)) {
      const timer = setTimeout(() => closeBasketModal(), 1450);

      return () => clearTimeout(timer);
    }
  }, [step]);

  if (!networkStore) return null;

  if (unstakeUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  if (unstakeUtils.isBasketStep(step)) {
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
      isOpen={isModalOpen}
      title={
        <OperationTitle
          title={t('staking.unstake.title', { asset: networkStore.chain.assets[0].symbol })}
          chainId={networkStore.chain.chainId}
        />
      }
      onClose={closeModal}
    >
      {unstakeUtils.isInitStep(step) && <UnstakeForm onGoBack={closeModal} />}
      {unstakeUtils.isConfirmStep(step) && (
        <Confirmation
          secondaryActionButton={
            initiatorWallet &&
            basketUtils.isBasketAvailable(initiatorWallet) && (
              <Button pallet="secondary" onClick={() => unstakeModel.events.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )
          }
          onGoBack={() => unstakeModel.events.stepChanged(Step.INIT)}
        />
      )}
      {unstakeUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => unstakeModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
