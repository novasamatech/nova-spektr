import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { amountFlowModel, amountFlowUtils } from '../model/amount-flow';
import { Step } from '../types';

import { AmountStep } from './AmountStep';
import { Confirmation } from './Confirmation';

/**
 * Amount → confirm → sign → submit, for whichever of the two actions was
 * requested. The title is the only thing the shell itself knows about the
 * mode.
 */
export const AmountFlow = () => {
  const { t } = useI18n();

  const step = useUnit(amountFlowModel.$step);
  const mode = useUnit(amountFlowModel.$mode);
  const [isFlowOpen, closeFlow] = useModalClose(!amountFlowUtils.isNoneStep(step), amountFlowModel.flowClosed);
  const [isBasketOpen, closeBasketModal] = useModalClose(
    amountFlowUtils.isBasketStep(step),
    amountFlowModel.flowClosed,
  );

  if (amountFlowUtils.isNoneStep(step)) return null;

  if (amountFlowUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isFlowOpen} onClose={closeFlow} />;
  }
  if (amountFlowUtils.isBasketStep(step)) {
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

  const title = mode === 'addStake' ? t('staking.amountFlow.title.addStake') : t('staking.amountFlow.title.unbond');

  return (
    <Modal isOpen={isFlowOpen} size="md" height="fit" onToggle={(open) => !open && closeFlow()}>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content>
        {amountFlowUtils.isInitStep(step) && <AmountStep />}
        {amountFlowUtils.isConfirmStep(step) && (
          <Confirmation onGoBack={() => amountFlowModel.stepChanged(Step.INIT)} />
        )}
        {amountFlowUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => amountFlowModel.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
