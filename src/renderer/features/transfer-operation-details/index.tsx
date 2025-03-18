import { isTransferTransaction, isXcmTransaction } from '@/entities/transaction';
import { multisigOperationSDK } from '@/sdk/multisig-operation';
import { confirmTransactionInfoSlot } from '@/features/multisig-operations';

import { TransactionAmount } from './components/TransactionAmount';
import { TransferOperationDetails } from './components/TransferOperationDetails';
import { TransferOperationTitle } from './components/TransferOperationTitle';
import { XcmTransferOperationTitle } from './components/XcmTransferOperationTitle';
import { useDecodedTransaction } from './hooks/useDecodedTransaction';
import { useTransactionAsset } from './hooks/useTransactionAsset';
import { transferOperationDetailFeature } from './model/feature';

export { transferOperationDetailFeature, useTransactionAsset, useDecodedTransaction };

multisigOperationSDK(transferOperationDetailFeature, {
  title({ transaction, chainId, variant }) {
    if (isTransferTransaction(transaction)) {
      return <TransferOperationTitle chainId={chainId} transaction={transaction} variant={variant} />;
    }
    if (isXcmTransaction(transaction)) {
      return <XcmTransferOperationTitle chainId={chainId} transaction={transaction} variant={variant} />;
    }

    return null;
  },
  details({ transaction, multisigAccountId, chainId }) {
    if (isTransferTransaction(transaction) || isXcmTransaction(transaction)) {
      return (
        <TransferOperationDetails transaction={transaction} multisigAccountId={multisigAccountId} chainId={chainId} />
      );
    }

    return null;
  },
});

// transferOperationDetailFeature.inject(operationTitleSlot, ({ operation }) => {
//   const transaction = operationDetailsUtils.getOperationData(operation);
//
//   if (isTransferTransaction(transaction)) {
//     return <TransferOperationTitle operation={operation} />;
//   }
//
//   if (isXcmTransaction(transaction)) {
//     return <XcmTransferOperationTitle operation={operation} />;
//   }
//
//   return null;
// });

transferOperationDetailFeature.inject(confirmTransactionInfoSlot, ({ operation }) => {
  return <TransactionAmount operation={operation} />;
});

// transferOperationDetailFeature.inject(logTitleSlot, ({ operation }) => {
//   const { t } = useI18n();
//   const transaction = operationDetailsUtils.getOperationData(operation);
//   const asset = useTransactionAsset(operation);
//   const amount = transaction ? getTransactionAmount(transaction) : null;
//
//   if (isTransferTransaction(transaction)) {
//     return (
//       <TransactionTitle
//         className="overflow-hidden"
//         title={t('operations.titles.transfer', { asset: asset?.symbol })}
//         icon="transferMst"
//       >
//         {asset && amount && <AssetBalance value={amount} asset={asset} className="truncate" />}
//       </TransactionTitle>
//     );
//   }
//
//   if (isXcmTransaction(transaction)) {
//     return (
//       <TransactionTitle
//         className="overflow-hidden"
//         title={t('operations.titles.crossChainTransfer', { asset: asset?.symbol })}
//         icon="transferMst"
//       >
//         {asset && amount && <AssetBalance value={amount} asset={asset} className="truncate" />}
//       </TransactionTitle>
//     );
//   }
//
//   return null;
// });
