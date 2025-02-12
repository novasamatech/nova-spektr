import { useUnit } from 'effector-react';

import { Slot } from '@/shared/di';
import { Modal } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { signOperationsUtils } from '../lib/sign-operations-utils';
import { signOperations } from '../model/sign';
import { Step } from '../types';

import { confirmDetailsSlot, confirmTitleSlot } from './SignOperations';

export const SignOperation = () => {
  const transactions = useUnit(signOperations.$transactions);
  const step = useUnit(signOperations.$step);
  const isModalOpen = useUnit(signOperations.$isModalOpen);
  const wallet = useUnit(walletSelect.$selectedWallet);

  const operation = transactions[0];

  if (signOperationsUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={signOperations.output.flowFinished} />;
  }

  return (
    <Modal size="md" isOpen={isModalOpen} onToggle={() => signOperations.output.flowFinished()}>
      <Modal.Title close>
        <Slot id={confirmTitleSlot} props={{ operation }} />
      </Modal.Title>
      <Modal.Content>
        {signOperationsUtils.isConfirmStep(step) && (
          <div>
            <Slot id={confirmDetailsSlot} props={{ operation }} />

            <Modal.Footer>
              <SignButton isDefault type={wallet?.type} onClick={signOperations.events.txsConfirmed} />
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
