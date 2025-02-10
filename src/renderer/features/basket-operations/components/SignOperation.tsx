import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { useSlot } from '@/shared/di';
import { useModalClose } from '@/shared/lib/hooks';
import { Modal } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { signOperationsUtils } from '../lib/sign-operations-utils';
import { signOperations } from '../model/sign';
import { Step } from '../types';

import { confirmDetailsSlot, confirmTitleSlot } from './SignOperations';

export const SignOperation = () => {
  const transactions = useUnit(signOperations.$transactions);
  const step = useUnit(signOperations.$step);

  const operation = transactions[0];

  const confirmTitle = useSlot(confirmTitleSlot, { props: { operation } });
  const confirmDetails = useSlot(confirmDetailsSlot, { props: { operation } });

  const [isModalOpen, closeModal] = useModalClose(
    !signOperationsUtils.isNoneStep(step),
    signOperations.output.flowFinished,
  );

  if (signOperationsUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  return (
    <Modal size="md" isOpen={isModalOpen} onToggle={() => closeModal()}>
      <Modal.Title close>{confirmTitle}</Modal.Title>
      <Modal.Content>
        {signOperationsUtils.isConfirmStep(step) && (
          <div>
            {confirmDetails}

            <Modal.Footer>
              <SignButton isDefault type={WalletType.POLKADOT_VAULT} onClick={signOperations.events.txsConfirmed} />
            </Modal.Footer>
          </div>
        )}

        {signOperationsUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => signOperations.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
