import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { unlockFlowModel, unlockFlowUtils } from '../model/unlock-flow';
import { Step } from '../types';

import { Confirmation } from './Confirmation';

/**
 * Confirm → sign → submit for a release already dispatched from the Locks
 * widget.
 *
 * Deliberately blind to the live lock data: the request it signs was
 * snapshotted into `unlockFlowModel` when the user pressed the button, so
 * nothing here has to follow the running referenda — and a block tick can't
 * disturb a signature in progress.
 */
export const UnlockFlow = () => {
  const { t } = useI18n();

  const step = useUnit(unlockFlowModel.$step);
  const isUndelegate = useUnit(unlockFlowModel.$isUndelegate);
  const [isFlowOpen, closeFlow] = useModalClose(!unlockFlowUtils.isNoneStep(step), unlockFlowModel.flowFinished);

  if (unlockFlowUtils.isNoneStep(step)) return null;

  if (unlockFlowUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isFlowOpen} onClose={closeFlow} />;
  }

  return (
    <Modal isOpen={isFlowOpen} size="md" height="fit" onToggle={(open) => !open && closeFlow()}>
      <Modal.Title close>
        {t(isUndelegate ? 'governanceUnlockFlow.undelegateTitle' : 'governanceUnlockFlow.title')}
      </Modal.Title>
      <Modal.Content>
        {unlockFlowUtils.isConfirmStep(step) && <Confirmation onGoBack={() => unlockFlowModel.flowFinished()} />}
        {unlockFlowUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => unlockFlowModel.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
