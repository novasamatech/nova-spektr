import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { t } from 'i18next';

import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { TransactionTitle, findCoreBatchAll, findCoreTransaction, getTransactionAmount } from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';
import { confirmTransactionInfoSlot } from '@/features/multisig-operations';

import { MultiTransferOperationDetails } from './components/MultiTransferOperationDetails';
import { TransactionAmount } from './components/TransactionAmount';

export const multiTransferOperationDetailFeature = createFeature({
  name: 'multi-transfer/operation-details',
});

multiTransferOperationDetailFeature.inject(confirmTransactionInfoSlot, ({ operation }) => {
  return <TransactionAmount operation={operation} />;
});

const isMultiTransfer = (transaction: Transaction | DecodedTransaction | null): boolean => {
  if (transaction?.type === TransactionType.BATCH_ALL) {
    const transactions = (transaction.args as { transactions?: Transaction[] })?.transactions || [];
    // Multi-transfer is a batch with TRANSFER transactions (can be 1 or more)
    return transactions.length > 0 && transactions.every((tx) => tx.type === TransactionType.TRANSFER);
  }
  return false;
};

multisigOperationsSDK(multiTransferOperationDetailFeature, {
  icon({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    const transactionFromBatchAll = findCoreBatchAll(transaction);

    if (isMultiTransfer(transaction) || isMultiTransfer(transactionFromBatchAll)) {
      return 'multiTransfer';
    }
  },
  title({ operation, showCoreTransaction }) {
    const chains = useUnit(networkModel.$chains);

    if (nullable(operation)) return null;

    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    const transactionFromBatchAll = findCoreBatchAll(transaction);

    if (isMultiTransfer(transaction) || isMultiTransfer(transactionFromBatchAll)) {
      const chain = chains[operation.chainId];
      const asset = chain ? getNativeAsset(chain.assets) : null;

      let amount: string | BN | null = null;
      if (transaction?.type === TransactionType.BATCH_ALL) {
        const batchAmounts: string[] = transaction.args?.transactions?.map(getTransactionAmount);
        amount = batchAmounts.reduce((acc, currentAmount) => acc.add(new BN(currentAmount)), new BN(0));
      }

      return {
        title: t('operations.titles.multiTransfer'),
        amount: asset && amount ? { value: amount, asset } : undefined,
        sourceChainId: operation.chainId,
      };
    }
  },
  logTitle({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    const { t } = useI18n();
    const transactionFromBatchAll = findCoreBatchAll(transaction);

    if (isMultiTransfer(transaction) || isMultiTransfer(transactionFromBatchAll)) {
      return <TransactionTitle className="overflow-hidden" title={t('operations.titles.multiTransfer')} />;
    }
  },
  details({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    const transactionFromBatchAll = findCoreBatchAll(transaction);

    if (isMultiTransfer(transaction) || isMultiTransfer(transactionFromBatchAll)) {
      return <MultiTransferOperationDetails operation={operation} />;
    }
    return null;
  },
});
