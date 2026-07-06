import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import {
  findCoreTransaction,
  getTransactionAmount,
  isTransferTransaction,
  isXcmTransaction,
} from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';
import { confirmTransactionInfoSlot } from '@/features/multisig-operations';

import { TransactionAmount } from './components/TransactionAmount';
import { TransferOperationDetails } from './components/TransferOperationDetails';

export const transferOperationDetailFeature = createFeature({
  name: 'transfer/operations',
});

transferOperationDetailFeature.inject(confirmTransactionInfoSlot, ({ operation }) => {
  return <TransactionAmount operation={operation} />;
});

multisigOperationsSDK(transferOperationDetailFeature, {
  icon({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    if (isTransferTransaction(transaction)) {
      return 'transferMst';
    }
    if (isXcmTransaction(transaction)) {
      return 'crossChain';
    }
  },
  title({ operation, showCoreTransaction, asset, t }) {
    if (nullable(operation) || nullable(asset) || nullable(t)) return null;

    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (isTransferTransaction(transaction)) {
      const amount = transaction ? getTransactionAmount(transaction) : null;
      const titleKey =
        transaction?.type === TransactionType.TRANSFER_ALL
          ? 'operations.titles.transferAll'
          : 'operations.titles.transfer';

      return {
        title: t(titleKey, { asset: asset.symbol }),
        amount: asset && amount ? { value: amount, asset } : undefined,
        sourceChainId: operation.chainId,
      };
    }

    if (isXcmTransaction(transaction)) {
      const coreTx = findCoreTransaction(transaction);
      const amount = coreTx ? getTransactionAmount(coreTx) : null;

      return {
        title: t('operations.titles.crossChainTransfer', { asset: asset?.symbol }),
        amount: asset && amount ? { value: amount, asset } : undefined,
        sourceChainId: operation.chainId,
        destinationChainId: transaction?.args.destinationChain,
      };
    }

    return null;
  },
  details({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (isTransferTransaction(transaction) || isXcmTransaction(transaction)) {
      return <TransferOperationDetails operation={operation} />;
    }

    return null;
  },
});
