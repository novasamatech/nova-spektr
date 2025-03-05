import { useI18n } from '@/shared/i18n';
import { AssetBalance } from '@/shared/ui-entities';
import { operationDetailsUtils } from '@/entities/operations';
import {
  TransactionTitle,
  getTransactionAmount,
  isTransferTransaction,
  isXcmTransaction,
} from '@/entities/transaction';
import {
  confirmTransactionInfoSlot,
  logTitleSlot,
  // operationDetailsSlot,
  operationTitleSlot,
} from '@/features/multisig-operations';

import { TransactionAmount } from './components/TransactionAmount';
// import { TransferOperationDetails } from './components/TransferOperationDetails';
import { TransferOperationTitle } from './components/TransferOperationTitle';
import { XcmTransferOperationTitle } from './components/XcmTransferOperationTitle';
import { useTransactionAsset } from './hooks/useTransactionAsset';
import { transferOperationDetailFeature } from './model/feature';

export { transferOperationDetailFeature };

// transferOperationDetailFeature.inject(operationDetailsSlot, {
//   order: 1,
//   render: ({ operation }) => {
//     const transaction = operationDetailsUtils.getOperationData(operation);

//     if (isTransferTransaction(transaction) || isXcmTransaction(transaction)) {
//       return <TransferOperationDetails operation={operation} />;
//     }

//     return null;
//   },
// });

transferOperationDetailFeature.inject(operationTitleSlot, ({ operation }) => {
  const transaction = operationDetailsUtils.getOperationData(operation);

  if (isTransferTransaction(transaction)) {
    return <TransferOperationTitle operation={operation} />;
  }

  if (isXcmTransaction(transaction)) {
    return <XcmTransferOperationTitle operation={operation} />;
  }

  return null;
});

transferOperationDetailFeature.inject(confirmTransactionInfoSlot, ({ operation }) => {
  return <TransactionAmount operation={operation} />;
});

transferOperationDetailFeature.inject(logTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = operationDetailsUtils.getOperationData(operation);
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
});
