import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { confirmFlowModel, confirmFlowUtils } from '../model/confirm-flow';
import { Step } from '../types';

import { Confirmation } from './Confirmation';

/**
 * Confirm → sign → submit for an action the dashboard has already decided.
 *
 * Deliberately blind to the live position: the set being nominated and the
 * figure being redeemed were snapshotted when the button was pressed, so an era
 * rolling over mid-signature cannot change what is signed. The title is the
 * only thing the shell itself knows about the mode.
 */
export const ConfirmFlow = () => {
  const { t } = useI18n();

  const step = useUnit(confirmFlowModel.$step);
  const mode = useUnit(confirmFlowModel.$mode);
  const [isFlowOpen, closeFlow] = useModalClose(!confirmFlowUtils.isNoneStep(step), confirmFlowModel.flowClosed);
  const [isBasketOpen, closeBasketModal] = useModalClose(
    confirmFlowUtils.isBasketStep(step),
    confirmFlowModel.flowClosed,
  );

  if (confirmFlowUtils.isNoneStep(step)) return null;

  if (confirmFlowUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isFlowOpen} onClose={closeFlow} />;
  }
  if (confirmFlowUtils.isBasketStep(step)) {
    return (
      <OperationResult
        isOpen={isBasketOpen}
        variant="success"
        title={t('operation.addedToBasket')}
        autoCloseTimeout={2000}
        onClose={closeBasketModal}
      />
    );
  }

  const title =
    mode === 'redeem' ? t('staking.confirmFlow.title.redeem') : t('staking.confirmFlow.title.changeValidators');

  return (
    <Modal isOpen={isFlowOpen} size="md" height="fit" onToggle={(open) => !open && closeFlow()}>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content>
        {confirmFlowUtils.isConfirmStep(step) && <Confirmation onGoBack={() => confirmFlowModel.flowClosed()} />}
        {confirmFlowUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => confirmFlowModel.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
