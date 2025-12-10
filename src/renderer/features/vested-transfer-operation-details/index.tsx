import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { t } from 'i18next';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nullable } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { networkModel } from '@/entities/network';
import { TransactionTitle, findCoreBatchAll, findCoreTransaction, getTransactionAmount } from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';
import { confirmTransactionInfoSlot } from '@/features/multisig-operations';

import { TransactionAmount } from './components/TransactionAmount';
import { VestedTransferOperationDetails } from './components/VestedTransferOperationDetails';

export const vestedTransferOperationDetailFeature = createFeature({
  name: 'vested-transfer/operation-details',
});

vestedTransferOperationDetailFeature.inject(confirmTransactionInfoSlot, ({ operation }) => {
  return <TransactionAmount operation={operation} />;
});

const getOperationTitle = (transactionType: TransactionType): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.VESTED_TRANSFER]: t('operations.titles.vestedTransfer'),
  };

  return Title[transactionType];
};

const getOperationIcon = (transactionType: TransactionType): IconNames | undefined => {
  const Icons: { [key in TransactionType]?: IconNames } = {
    [TransactionType.VESTED_TRANSFER]: 'vestedTransferMst',
  };

  return Icons[transactionType];
};

multisigOperationsSDK(vestedTransferOperationDetailFeature, {
  icon({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    const transactionFromBatchAll = findCoreBatchAll(transaction);

    const icon =
      (transaction?.type && getOperationIcon(transaction.type)) ||
      (transactionFromBatchAll?.type && getOperationIcon(transactionFromBatchAll.type));

    if (icon) {
      return icon;
    }
  },
  title({ operation, showCoreTransaction }) {
    const chains = useUnit(networkModel.$chains);
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    const transactionFromBatchAll = findCoreBatchAll(transaction);

    const title =
      (transaction?.type && getOperationTitle(transaction.type)) ||
      (transactionFromBatchAll?.type && getOperationTitle(transactionFromBatchAll.type));

    if (title) {
      const chain = chains[operation.chainId];
      const asset = chain ? getNativeAsset(chain.assets) : null;

      let amount: string | BN | null = null;
      if (transaction?.type === TransactionType.BATCH_ALL) {
        const batchAmounts: string[] = transaction.args?.transactions?.map(getTransactionAmount);
        amount = batchAmounts.reduce((acc, currentAmount) => acc.add(new BN(currentAmount)), new BN(0));
      } else {
        amount = transaction && getTransactionAmount(transaction);
      }

      return {
        title,
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

    const title =
      (transaction?.type && getOperationTitle(transaction.type)) ||
      (transactionFromBatchAll?.type && getOperationTitle(transactionFromBatchAll.type));

    if (title) {
      return <TransactionTitle className="overflow-hidden" title={t(title || '')} />;
    }
  },
  details({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    const transactionFromBatchAll = findCoreBatchAll(transaction);

    if (
      transaction?.type === TransactionType.VESTED_TRANSFER ||
      transactionFromBatchAll?.type === TransactionType.VESTED_TRANSFER
    ) {
      return <VestedTransferOperationDetails operation={operation} />;
    }
    return null;
  },
});
