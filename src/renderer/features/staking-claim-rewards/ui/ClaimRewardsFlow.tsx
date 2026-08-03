import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { claimRewardsModel, claimRewardsUtils } from '../model/claim';
import { Step } from '../types';

import { Confirmation } from './Confirmation';

/**
 * Confirm → sign → submit for a claim already dispatched from the dashboard.
 *
 * Deliberately blind to the live payout data: the set being claimed was
 * snapshotted into `claimRewardsModel` when the button was pressed, so an era
 * rolling over mid-signature cannot change what is signed.
 */
export const ClaimRewardsFlow = () => {
  const { t } = useI18n();

  const step = useUnit(claimRewardsModel.$step);
  const [isFlowOpen, closeFlow] = useModalClose(!claimRewardsUtils.isNoneStep(step), claimRewardsModel.flowFinished);

  if (claimRewardsUtils.isNoneStep(step)) return null;

  if (claimRewardsUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isFlowOpen} onClose={closeFlow} />;
  }

  return (
    <Modal isOpen={isFlowOpen} size="md" height="fit" onToggle={(open) => !open && closeFlow()}>
      <Modal.Title close>{t('staking.claimRewards.title')}</Modal.Title>
      <Modal.Content>
        {claimRewardsUtils.isConfirmStep(step) && <Confirmation onGoBack={() => claimRewardsModel.flowFinished()} />}
        {claimRewardsUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => claimRewardsModel.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
