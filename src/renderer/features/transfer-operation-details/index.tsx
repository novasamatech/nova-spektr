import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { AssetBalance } from '@/shared/ui-entities';
import {
  TransactionTitle,
  getTransactionAmount,
  isTransferTransaction,
  isXcmTransaction,
  useTransactionAsset,
} from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';
import { confirmTransactionInfoSlot } from '@/features/multisig-operations';

import { TransactionAmount } from './components/TransactionAmount';
import { TransferOperationDetails } from './components/TransferOperationDetails';
import { TransferOperationTitle } from './components/TransferOperationTitle';
import { XcmTransferOperationTitle } from './components/XcmTransferOperationTitle';

export const transferOperationDetailFeature = createFeature({
  name: 'transfer/operations',
});

transferOperationDetailFeature.inject(confirmTransactionInfoSlot, ({ operation }) => {
  return <TransactionAmount operation={operation} />;
});

multisigOperationsSDK(transferOperationDetailFeature, {
  title({ operation }) {
    const transaction = operation.transaction;

    if (isTransferTransaction(transaction)) {
      return <TransferOperationTitle operation={operation} />;
    }

    if (isXcmTransaction(transaction)) {
      return <XcmTransferOperationTitle operation={operation} />;
    }

    return null;
  },
  logTitle({ operation }) {
    const { t } = useI18n();
    const transaction = operation.transaction;
    const asset = useTransactionAsset(operation);
    const amount = transaction ? getTransactionAmount(transaction) : null;

    if (isTransferTransaction(transaction)) {
      return (
        <TransactionTitle
          className="overflow-hidden"
          title={t('operations.titles.transfer', { asset: asset?.symbol })}
          icon="transferMst"
        >
          {asset && amount && <AssetBalance value={amount} asset={asset} className="truncate" />}
        </TransactionTitle>
      );
    }

    if (isXcmTransaction(transaction)) {
      return (
        <TransactionTitle
          className="overflow-hidden"
          title={t('operations.titles.crossChainTransfer', { asset: asset?.symbol })}
          icon="transferMst"
        >
          {asset && amount && <AssetBalance value={amount} asset={asset} className="truncate" />}
        </TransactionTitle>
      );
    }

    return null;
  },
  details({ operation }) {
    const transaction = operation.transaction;

    if (isTransferTransaction(transaction) || isXcmTransaction(transaction)) {
      return <TransferOperationDetails operation={operation} />;
    }

    return null;
  },
});
