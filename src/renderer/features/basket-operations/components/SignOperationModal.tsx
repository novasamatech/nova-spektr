import { useUnit } from 'effector-react';

import { Slot } from '@/shared/di';
import { Modal } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { signOperations } from '../model/sign';
import { signOperationsUtils } from '../service/sign-operations-utils';
import { Step } from '../types';

import { basketTransactionConfirmDetailsSlot, basketTransactionConfirmTitleSlot } from './SignOperationsModal';

export const SignOperationModal = () => {
  const transactions = useUnit(signOperations.$transactions);
  const step = useUnit(signOperations.$step);
  const isModalOpen = useUnit(signOperations.$isModalOpen);
  const wallet = useUnit(walletSelect.$selectedWallet);

  const transaction = transactions.at(0);

  if (!transaction) return null;

  if (signOperationsUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={() => signOperations.finishFlow()} />;
  }

  return (
    <Modal size="md" isOpen={isModalOpen} onToggle={() => signOperations.finishFlow()}>
      <Modal.Title close>
        <Slot id={basketTransactionConfirmTitleSlot} props={{ transaction }} />
      </Modal.Title>
      <Modal.Content>
        {signOperationsUtils.isConfirmStep(step) && (
          <div>
            <Slot id={basketTransactionConfirmDetailsSlot} props={{ transaction }} />

            <Modal.Footer>
              <SignButton isDefault type={wallet?.type} onClick={signOperations.txsConfirmed} />
            </Modal.Footer>
          </div>
        )}

        {signOperationsUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => signOperations.changeStep(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
