import { useGate } from 'effector-react';

import { isTransferTransaction, isXcmTransaction } from '@/entities/transaction';
import { basketOperationsService } from '@/aggregates/basket-operations';
import { basketSDK } from '@/sdk/basket';
import { TransferConfirm } from '@/features/operations/OperationsConfirm';
import { transferValidateModel } from '@/features/operations/OperationsValidation';

import { ConfirmTitle } from './components/ConfirmTitle';
import { OperationTitle } from './components/OperationTitle';
import { confirm } from './model/confirm';
import { transferBasketFeature } from './model/feature';

export { transferBasketFeature };

basketSDK(transferBasketFeature, {
  operationTitle({ transaction }) {
    const tx = basketOperationsService.getCoreTx(transaction);

    if (isTransferTransaction(tx) || isXcmTransaction(tx)) {
      return <OperationTitle coreTx={tx} />;
    }

    return null;
  },
  transactionConfirmTitle({ transaction }) {
    return <ConfirmTitle transaction={transaction} />;
  },
  transactionConfirmDetails({ transaction }) {
    useGate(confirm.flow, transaction);

    const tx = basketOperationsService.getCoreTx(transaction);

    if (isTransferTransaction(tx) || isXcmTransaction(tx)) {
      return <TransferConfirm id={transaction.id} hideSignButton />;
    }

    return null;
  },
  validation(errors, { transaction }) {
    if (isTransferTransaction(transaction.coreTx) || isXcmTransaction(transaction.coreTx)) {
      return transferValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }

    return errors;
  },
});
