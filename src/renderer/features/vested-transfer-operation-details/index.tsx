import { t } from 'i18next';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { TransactionTitle, findCoreBatchAll, findCoreTransaction } from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';

import { VestedTransferOperationDetails } from './components/VestedTransferOperationDetails';
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
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    const transactionFromBatchAll = findCoreBatchAll(transaction);

    const title =
      (transaction?.type && getOperationTitle(transaction.type)) ||
      (transactionFromBatchAll?.type && getOperationTitle(transactionFromBatchAll.type));
    if (title) {
      return <VestedTransferOperationTitle operation={operation} title={title} />;
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
