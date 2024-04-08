import { useUnit } from 'effector-react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { OperationSign, OperationSubmit } from '@features/operations';
import { RewardDestinationForm } from './RewardDestinationForm';
import { Confirmation } from './Confirmation';
import { destinationUtils } from '../lib/destination-utils';
import { destinationModel } from '../model/destination-model';
import { Step } from '../lib/types';

export const RewardDestination = () => {
  const { t } = useI18n();

  const step = useUnit(destinationModel.$step);
  const walletData = useUnit(destinationModel.$walletData);

  const [isModalOpen, closeModal] = useModalClose(
    !destinationUtils.isNoneStep(step),
    destinationModel.output.flowFinished,
  );

  if (!walletData) return null;

  if (destinationUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="w-max"
      isOpen={isModalOpen}
      title={
        <OperationTitle
          title={t('staking.destination.title', { asset: walletData.chain.assets[0].symbol })}
          chainId={walletData.chain.chainId}
        />
      }
      onClose={closeModal}
    >
      {destinationUtils.isInitStep(step) && <RewardDestinationForm onGoBack={closeModal} />}
      {destinationUtils.isConfirmStep(step) && (
        <Confirmation onGoBack={() => destinationModel.events.stepChanged(Step.INIT)} />
      )}
      {destinationUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => destinationModel.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
