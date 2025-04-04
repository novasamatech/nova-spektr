import {
  isTransferTransaction,
  isXcmTransaction,
  types,
  useDecodedTransaction,
  useTransactionAsset,
} from '@/entities/transaction';
import { multisigOperationSDK } from '@/sdk/multisig-operation';

import { TransferOperationDetails } from './components/TransferOperationDetails';
import { transferOperationDetailFeature } from './model/feature';

export { transferOperationDetailFeature, useTransactionAsset, useDecodedTransaction };

multisigOperationSDK(transferOperationDetailFeature, {
  icon({ transaction }) {
    if (!transaction) return;
    if (types.isTransferTransaction(transaction)) {
      return 'transferMst';
    }
    if (types.isXcmTransferTransaction(transaction)) {
      return 'crossChain';
    }
  },
  title({ transaction }) {
    if (!transaction) return;
    if (types.isTransferTransaction(transaction)) {
      return 'operations.titles.transfer';
    }
    if (types.isXcmTransferTransaction(transaction)) {
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
