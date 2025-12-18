import { BN, BN_ZERO } from '@polkadot/util';

import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nullable } from '@/shared/lib/utils';
import {
  TransactionTitle,
  findCoreTransaction,
  getTransactionAmount,
  isMultiTransferTransaction,
} from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';
import { confirmTransactionInfoSlot } from '@/features/multisig-operations';

import { MultiTransferOperationDetails } from './components/MultiTransferOperationDetails';
import { TransactionAmount } from './components/TransactionAmount';

export const multiTransferOperationDetailFeature = createFeature({
  name: 'multi-transfer/operation-details',
});

multiTransferOperationDetailFeature.inject(confirmTransactionInfoSlot, ({ operation }) => {
  return <TransactionAmount operation={operation} />;
});

multisigOperationsSDK(multiTransferOperationDetailFeature, {
  icon({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    if (isMultiTransferTransaction(transaction)) {
      return 'multiTransfer';
    }
  },
  title({ operation, showCoreTransaction, chains, t }) {
    if (nullable(operation) || nullable(chains) || nullable(t)) return null;

    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    if (isMultiTransferTransaction(transaction)) {
      const chain = chains[operation.chainId];
      const asset = chain ? getNativeAsset(chain.assets) : null;

      const batchAmounts: string[] = transaction.args?.transactions?.map(getTransactionAmount);
      const amount = batchAmounts.reduce((acc, currentAmount) => acc.add(new BN(currentAmount)), BN_ZERO);

      return {
        title: t('operations.titles.multiTransfer'),
        amount: asset && amount ? { value: amount, asset } : undefined,
        sourceChainId: operation.chainId,
      };
    }
  },
  logTitle({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    const { t } = useI18n();

    if (isMultiTransferTransaction(transaction)) {
      return <TransactionTitle className="overflow-hidden" title={t('operations.titles.multiTransfer')} />;
    }
  },
  details({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (nullable(transaction)) {
      return null;
    }

    if (isMultiTransferTransaction(transaction)) {
      return <MultiTransferOperationDetails operation={operation} />;
    }
    return null;
  },
});
