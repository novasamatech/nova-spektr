import { createFeature } from '@/shared/feature';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { isTransferTransaction, isXcmTransaction } from '@/entities/transaction';
import { multisigOperationsFeature } from '@/features/multisig-operations';

import { TransferOperationDetails } from './components/TransferOperationDetails';
import { TransferOperationTitle } from './components/TransferOperationTitle';
import { XcmTransferOperationTitle } from './components/XcmTransferOperationTitle';

export const transferOperationDetailFeature = createFeature({
  name: 'transfer/operations',
});

transferOperationDetailFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => {
    const transaction = getTransactionFromMultisigTx(operation);

    if (isTransferTransaction(transaction) || isXcmTransaction(transaction)) {
      return <TransferOperationDetails operation={operation} />;
    }

    return null;
  },
  order: 1,
});

transferOperationDetailFeature.inject(multisigOperationsFeature.slots.operationTitle, {
  render: ({ operation }) => {
    const transaction = getTransactionFromMultisigTx(operation);

    if (isTransferTransaction(transaction)) {
      return <TransferOperationTitle operation={operation} />;
    }

    if (isXcmTransaction(transaction)) {
      return <XcmTransferOperationTitle operation={operation} />;
    }

    return null;
  },
  order: 1,
});
