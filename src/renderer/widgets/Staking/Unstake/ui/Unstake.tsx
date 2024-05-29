import { useUnit } from 'effector-react';

import { BaseModal, Button } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { OperationSign, OperationSubmit } from '@features/operations';
import { UnstakeForm } from './UnstakeForm';
import { Confirmation } from './Confirmation';
import { unstakeUtils } from '../lib/unstake-utils';
import { unstakeModel } from '../model/unstake-model';
import { Step } from '../lib/types';
import { basketUtils } from '@features/operations/OperationsConfirm';

export const Unstake = () => {
  const { t } = useI18n();

  const step = useUnit(unstakeModel.$step);
  const networkStore = useUnit(unstakeModel.$networkStore);
  const initiatorWallet = useUnit(unstakeModel.$initiatorWallet);

  const [isModalOpen, closeModal] = useModalClose(!unstakeUtils.isNoneStep(step), unstakeModel.output.flowFinished);

  if (!networkStore) return null;

  if (unstakeUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

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
