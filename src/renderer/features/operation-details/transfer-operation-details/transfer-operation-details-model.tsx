import { createFeature } from '@/shared/effector';
import { isTransferTransaction } from '@/entities/transaction';
import { multisigOperationsFeature } from '@/features/multisig-operations';

import { TransferOperationDetails } from './components/TransferOperationDetails';
import { TransferOperationTitle } from './components/TransferOperationTitle';

export const transferOperationDetailFeature = createFeature({
  name: 'Transfer operation details',
});

transferOperationDetailFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => {
    const transaction = operation.transaction;

    if (isTransferTransaction(transaction)) {
      return <TransferOperationDetails operation={operation} />;
    }

    return null;
  },
  order: 1,
});

transferOperationDetailFeature.inject(multisigOperationsFeature.slots.operationTitle, ({ operation }) => {
  if (isTransferTransaction(operation.transaction)) {
    return <TransferOperationTitle tx={operation} />;
  }

  return null;
});
