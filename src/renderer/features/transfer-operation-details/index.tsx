import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { AssetBalance, AssetIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { ChainTitle, XcmChains } from '@/entities/chain';
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
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (isTransferTransaction(transaction)) {
      const asset = useTransactionAsset(transaction, operation.chainId);
      const amount = transaction ? getTransactionAmount(transaction) : null;

      return {
        name: (
          <TransactionTitle
            className="flex-1 overflow-hidden"
            title={t('operations.titles.transfer', { asset: asset?.symbol })}
          />
        ),
        amount:
          asset && amount ? (
            <Box width="160px" direction="row" gap={2} verticalAlign="center">
              <AssetIcon asset={asset} size={32} />
              <AssetBalance value={amount} asset={asset} />
            </Box>
          ) : undefined,
        chain: <ChainTitle chainId={operation.chainId} className="w-[114px]" />,
      };
    }

    if (isXcmTransaction(transaction)) {
      const coreTx = findCoreTransaction(transaction);
      const asset = useTransactionAsset(coreTx, operation.chainId);
      const amount = coreTx ? getTransactionAmount(coreTx) : null;

      return {
        name: (
          <TransactionTitle
            className="flex-1 overflow-hidden"
            title={t('operations.titles.crossChainTransfer', { asset: asset?.symbol })}
          />
        ),
        amount:
          asset && amount ? (
            <Box width="160px" direction="row" gap={2} verticalAlign="center">
              <AssetIcon asset={asset} size={32} />
              <AssetBalance value={amount} asset={asset} />
            </Box>
          ) : undefined,
        chain: (
          <XcmChains
            chainIdFrom={operation.chainId}
            chainIdTo={transaction?.args.destinationChain}
            className="w-[114px]"
          />
        ),
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
