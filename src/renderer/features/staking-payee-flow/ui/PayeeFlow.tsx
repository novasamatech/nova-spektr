import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { BASKET_RESULT_AUTO_CLOSE_MS } from '@/shared/transactions';
import { Modal } from '@/shared/ui-kit';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { payeeFlowModel, payeeFlowUtils } from '../model/payee-flow';
import { Step } from '../types';

import { Confirmation } from './Confirmation';
import { DestinationStep } from './DestinationStep';

/** Destination → confirm → sign → submit. */
export const PayeeFlow = () => {
  const { t } = useI18n();

  const step = useUnit(payeeFlowModel.$step);
  const [isFlowOpen, closeFlow] = useModalClose(!payeeFlowUtils.isNoneStep(step), payeeFlowModel.flowClosed);
  const [isBasketOpen, closeBasketModal] = useModalClose(payeeFlowUtils.isBasketStep(step), payeeFlowModel.flowClosed);

  if (payeeFlowUtils.isNoneStep(step)) return null;

  if (payeeFlowUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isFlowOpen} onClose={closeFlow} />;
  }
  if (payeeFlowUtils.isBasketStep(step)) {
    return (
      <OperationResult
        isOpen={isBasketOpen}
        variant="success"
        title={t('operation.addedToBasket')}
        autoCloseTimeout={BASKET_RESULT_AUTO_CLOSE_MS}
        onClose={closeBasketModal}
      />
    );
  }

  return (
    <Modal isOpen={isFlowOpen} size="md" height="fit" onToggle={(open) => !open && closeFlow()}>
      <Modal.Title close>{t('staking.payeeFlow.title')}</Modal.Title>
      <Modal.Content>
        {payeeFlowUtils.isInitStep(step) && <DestinationStep />}
        {payeeFlowUtils.isConfirmStep(step) && <Confirmation onGoBack={() => payeeFlowModel.stepChanged(Step.INIT)} />}
        {payeeFlowUtils.isSignStep(step) && <OperationSign onGoBack={() => payeeFlowModel.stepChanged(Step.CONFIRM)} />}
      </Modal.Content>
    </Modal>
  );
};
