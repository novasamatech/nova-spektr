import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { BASKET_RESULT_AUTO_CLOSE_MS } from '@/shared/transactions';
import { Modal } from '@/shared/ui-kit';
import { OperationResult } from '@/entities/transaction';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { ValidatorSelectionModal } from '@/features/validator-selection';
import { newPositionFlowModel, newPositionFlowUtils } from '../model/new-position-flow';
import { Step } from '../types';

import { Confirmation } from './Confirmation';
import { InitStep } from './InitStep';

/**
 * Form → validators → confirm → sign → submit, all over the dashboard.
 *
 * The validators step is not a panel inside this modal: the picker is a modal
 * of its own, shared with the Staking page. So the shell steps aside for it
 * rather than nesting one modal in another. Back from the confirm returns to
 * the picker with the selection intact — it is only cleared when the step is
 * left for good.
 */
export const NewPositionFlow = () => {
  const { t } = useI18n();

  const step = useUnit(newPositionFlowModel.$step);
  const [isFlowOpen, closeFlow] = useModalClose(
    !newPositionFlowUtils.isNoneStep(step),
    newPositionFlowModel.flowClosed,
  );
  const [isBasketOpen, closeBasketModal] = useModalClose(
    newPositionFlowUtils.isBasketStep(step),
    newPositionFlowModel.flowClosed,
  );

  if (newPositionFlowUtils.isNoneStep(step)) return null;

  if (newPositionFlowUtils.isBasketStep(step)) {
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

  if (newPositionFlowUtils.isValidatorsStep(step)) {
    // `isOpen` has to come from the same `useModalClose` the shell's own modal
    // uses. Hardcoding it here left the hook thinking the flow had been
    // dismissed the moment the outer modal unmounted, and the whole flow closed
    // on the way into this step. Back returns to the form; the cross ends the
    // flow — the same split the Staking page's bond-nominate uses.
    return (
      <ValidatorSelectionModal
        isOpen={isFlowOpen}
        onGoBack={() => newPositionFlowModel.validatorsCancelled()}
        onClose={closeFlow}
      />
    );
  }

  if (newPositionFlowUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isFlowOpen} onClose={closeFlow} />;
  }

  return (
    // A bounded height, unlike the sibling flows' fitted one: this form asks
    // four questions where they ask one, and fitted to its content the card grew
    // past the viewport. The centring container clips the overflow, so the
    // footer — and the Continue button in it — was cut off and unclickable.
    // Bounding the height puts the overflow in the content's own scroll area.
    <Modal isOpen={isFlowOpen} size="mdlg" height="lg" onToggle={(open) => !open && closeFlow()}>
      <Modal.Title close>{t('staking.newPosition.title')}</Modal.Title>
      {/*
        `disableScroll` because each step brings its own scroll area and footer.
        Left on, `Modal.Content` wraps them in a second scroll area that sizes to
        its content, which grows the card past its bounded height and pushes the
        footer out of the clipped box — the Continue button ends up under the
        overlay, visible but not clickable.
      */}
      <Modal.Content disableScroll>
        {newPositionFlowUtils.isInitStep(step) && <InitStep />}
        {newPositionFlowUtils.isConfirmStep(step) && (
          <Confirmation onGoBack={() => newPositionFlowModel.stepChanged(Step.VALIDATORS)} />
        )}
        {newPositionFlowUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => newPositionFlowModel.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
