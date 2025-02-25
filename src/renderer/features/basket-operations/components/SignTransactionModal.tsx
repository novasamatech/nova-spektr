import { useStoreMap, useUnit } from 'effector-react';

import { Slot } from '@/shared/di';
import { nonNullable } from '@/shared/lib/utils';
import { Loader } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { signOperations } from '../model/sign';
import { validation } from '../model/validation';
import { signOperationsUtils } from '../service/sign-operations-utils';
import { Step } from '../types';

import { basketTransactionConfirmDetailsSlot, basketTransactionConfirmTitleSlot } from './SignTransactionsModal';

export const SignTransactionModal = () => {
  const transactions = useUnit(signOperations.$transactions);
  const step = useUnit(signOperations.$step);
  const isModalOpen = useUnit(signOperations.$isModalOpen);
  const wallet = useUnit(walletSelect.$selectedWallet);

  const transaction = transactions.at(0);

  const validationResult = useStoreMap({
    store: validation.$validatingResults,
    keys: [transaction?.id],
    fn: (results, [id]) => (nonNullable(id) ? (results[id] ?? null) : null),
  });

  const pending = useStoreMap({
    store: validation.$pending,
    keys: [transaction?.id],
    fn: (results, [id]) => (nonNullable(id) ? (results[id] ?? true) : true),
  });

  if (!transaction) return null;

  if (signOperationsUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={() => signOperations.finishFlow()} />;
  }

  const canSign = validationResult && validationResult.length === 0;

  return (
    <Modal size="md" isOpen={isModalOpen} onToggle={() => signOperations.finishFlow()}>
      <Modal.Title close>
        <Slot id={basketTransactionConfirmTitleSlot} props={{ transaction }} />
      </Modal.Title>
      <Modal.Content>
        {signOperationsUtils.isConfirmStep(step) && (
          <div>
            <Slot id={basketTransactionConfirmDetailsSlot} props={{ transaction }} />
          </div>
        )}

        {signOperationsUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => signOperations.changeStep(Step.CONFIRM)} />
        )}
      </Modal.Content>
      {signOperationsUtils.isConfirmStep(step) && (
        <Modal.Footer>
          {pending && <Loader color="primary" size={24} />}
          <SignButton isDefault type={wallet?.type} disabled={!canSign || pending} onClick={signOperations.confirm} />
        </Modal.Footer>
      )}
    </Modal>
  );
};
