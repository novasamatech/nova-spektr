import {
  isTransferTransaction,
  isXcmTransaction,
  useDecodedTransaction,
  useTransactionAsset,
} from '@/entities/transaction';
import { multisigOperationSDK } from '@/sdk/multisig-operation';

import { TransferOperationDetails } from './components/TransferOperationDetails';
import { transferOperationDetailFeature } from './model/feature';

export { transferOperationDetailFeature, useTransactionAsset, useDecodedTransaction };

multisigOperationSDK(transferOperationDetailFeature, {
  icon({ operation }) {
    if (isTransferTransaction(operation)) {
      return 'transferMst';
    }
    if (isXcmTransaction(operation)) {
      return 'crossChain';
    }
  },
  title({ operation }) {
    if (isTransferTransaction(operation)) {
      return 'operations.titles.transfer';
    }
    if (isXcmTransaction(operation)) {
      return 'operations.titles.crossChainTransfer';
    }
  },
  additionalInfo() {
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

// transferOperationDetailFeature.inject(confirmTransactionInfoSlot, ({ operation }) => {
//   return <TransactionAmount operation={operation} />;
// });

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
