import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { AssetBalance } from '@/shared/ui-entities';
import {
  TransactionTitle,
  findCoreTransaction,
  getTransactionAmount,
  isTransferTransaction,
  isXcmTransaction,
  useTransactionAsset,
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
  title({ operation, showCoreTransaction }) {
    const { t } = useI18n();

    if (nullable(operation)) return null;

    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (isTransferTransaction(transaction)) {
      const asset = useTransactionAsset(transaction, operation.chainId);
      const amount = transaction ? getTransactionAmount(transaction) : null;

      return {
        title: t('operations.titles.transfer', { asset: asset?.symbol }),
        amount: asset && amount ? { value: amount, asset } : undefined,
        sourceChainId: operation.chainId,
      };
    }

    if (isXcmTransaction(transaction)) {
      const coreTx = findCoreTransaction(transaction);
      const asset = useTransactionAsset(coreTx, operation.chainId);
      const amount = coreTx ? getTransactionAmount(coreTx) : null;

      return {
        title: t('operations.titles.crossChainTransfer', { asset: asset?.symbol }),
        amount: asset && amount ? { value: amount, asset } : undefined,
        sourceChainId: operation.chainId,
        destinationChainId: transaction?.args.destinationChain,
      };
    }
  },
  logTitle({ operation, showCoreTransaction }) {
    const { t } = useI18n();
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const asset = useTransactionAsset(transaction, operation.chainId);
    const amount = transaction ? getTransactionAmount(transaction) : null;

    if (isTransferTransaction(transaction)) {
      return (
        <TransactionTitle className="overflow-hidden" title={t('operations.titles.transfer', { asset: asset?.symbol })}>
          {asset && amount && <AssetBalance value={amount} asset={asset} className="truncate" />}
        </TransactionTitle>
      );
    }

    if (isXcmTransaction(transaction)) {
      return (
        <TransactionTitle
          className="overflow-hidden"
          title={t('operations.titles.crossChainTransfer', { asset: asset?.symbol })}
        >
          {asset && amount && <AssetBalance value={amount} asset={asset} className="truncate" />}
        </TransactionTitle>
      );
    }
  },
  details({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (isTransferTransaction(transaction) || isXcmTransaction(transaction)) {
      return <TransferOperationDetails operation={operation} />;
    }

    return null;
  },
});
