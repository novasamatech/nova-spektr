import { t } from 'i18next';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { type IconNames } from '@/shared/ui';
import { TransactionTitle, findCoreBatchAll, findCoreTransaction } from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';

import { VestedTransferOperationTitle } from './components/VestedTransferOperationTitle';

export const vestedTransferOperationDetailFeature = createFeature({
  name: 'vested-transfer/operation-details',
});

const getOperationTitle = (transactionType: TransactionType): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.VESTED_TRANSFER]: t('operations.titles.vestedTransfer'),
  };

  return Title[transactionType];
};

const getOperationIcon = (transactionType: TransactionType): IconNames | undefined => {
  const Icons: { [key in TransactionType]?: IconNames } = {
    [TransactionType.VESTED_TRANSFER]: 'transferMst',
  };

  return Icons[transactionType];
};

multisigOperationsSDK(vestedTransferOperationDetailFeature, {
  icon({ operation, showCoreTransaction }) {
    if (!operation.transaction) {
      return null;
    }

    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const transactionFromBatchAll = findCoreBatchAll(operation.transaction);

    const icon =
      (transaction?.type && getOperationIcon(transaction.type)) ||
      (transactionFromBatchAll?.type && getOperationIcon(transactionFromBatchAll.type));

    if (icon) {
      return icon;
    }
  },
  title({ operation, showCoreTransaction }) {
    if (!operation.transaction) {
      return null;
    }

    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const transactionFromBatchAll = findCoreBatchAll(operation.transaction);

    const title =
      (transaction?.type && getOperationTitle(transaction.type)) ||
      (transactionFromBatchAll?.type && getOperationTitle(transactionFromBatchAll.type));
    if (title) {
      return <VestedTransferOperationTitle operation={operation} title={title} />;
    }
  },
  logTitle({ operation, showCoreTransaction }) {
    const { t } = useI18n();
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const title = transaction?.type && getOperationTitle(transaction.type);
    if (title) {
      return <TransactionTitle className="overflow-hidden" title={t(title || '')} />;
    }
  },
  details() {
    return null;
  },
});
