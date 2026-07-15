import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { claimModel, claimUtils } from '../model/claim';
import { Step } from '../types';

import { Confirmation } from './Confirmation';

/**
 * Confirm → sign → submit for a claim already dispatched from the schedules UI.
 *
 * Deliberately blind to the vesting data: the claim it signs was snapshotted
 * into `claimModel` when the user pressed the button, so nothing here has to
 * follow the live schedules — and a block tick can't disturb a signature in
 * progress.
 */
export const ClaimFlow = () => {
  const { t } = useI18n();

  const step = useUnit(claimModel.$step);
  const [isFlowOpen, closeFlow] = useModalClose(!claimUtils.isNoneStep(step), claimModel.flowFinished);

  if (claimUtils.isNoneStep(step)) return null;

  if (claimUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isFlowOpen} onClose={closeFlow} />;
  }

  return (
    <Modal isOpen={isFlowOpen} size="md" height="fit" onToggle={(open) => !open && closeFlow()}>
      <Modal.Title close>{t('operations.modalTitles.vest')}</Modal.Title>
      <Modal.Content>
        {claimUtils.isConfirmStep(step) && <Confirmation onGoBack={() => claimModel.flowFinished()} />}
        {claimUtils.isSignStep(step) && <OperationSign onGoBack={() => claimModel.stepChanged(Step.CONFIRM)} />}
      </Modal.Content>
    </Modal>
  );
};
