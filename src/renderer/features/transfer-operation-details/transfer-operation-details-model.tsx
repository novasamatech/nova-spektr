import { useUnit } from 'effector-react';

import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { getAssetById } from '@/shared/lib/utils';
import { AssetBalance } from '@/entities/asset';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import {
  TransactionTitle,
  getTransactionAmount,
  isTransferTransaction,
  isXcmTransaction,
} from '@/entities/transaction';
import { logTitleSlot, operationDetailsSlot, operationTitleSlot } from '@/features/multisig-operations';

import { TransferOperationDetails } from './components/TransferOperationDetails';
import { TransferOperationTitle } from './components/TransferOperationTitle';
import { XcmTransferOperationTitle } from './components/XcmTransferOperationTitle';

export const transferOperationDetailFeature = createFeature({
  name: 'transfer/operations',
});

transferOperationDetailFeature.inject(operationDetailsSlot, {
  render: ({ operation }) => {
    const transaction = getTransactionFromMultisigTx(operation);

    if (isTransferTransaction(transaction) || isXcmTransaction(transaction)) {
      return <TransferOperationDetails operation={operation} />;
    }

    return null;
  },
  order: 1,
});

transferOperationDetailFeature.inject(operationTitleSlot, ({ operation }) => {
  const transaction = getTransactionFromMultisigTx(operation);

  if (isTransferTransaction(transaction)) {
    return <TransferOperationTitle operation={operation} />;
  }

  if (isXcmTransaction(transaction)) {
    return <XcmTransferOperationTitle operation={operation} />;
  }

  return null;
});

transferOperationDetailFeature.inject(logTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = getTransactionFromMultisigTx(operation);
  const chains = useUnit(networkModel.$chains);

  const assetId = transaction?.args.assetId || transaction?.args.asset;
  const asset = getAssetById(assetId, chains[operation.chainId]?.assets);

  const amount = transaction && getTransactionAmount(transaction);

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
