import { useUnit } from 'effector-react';
import { t } from 'i18next';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { getAssetById, toAccountId } from '@/shared/lib/utils';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { proxyUtils } from '@/entities/proxy';
import {
  TransactionTitle,
  findCoreTransaction,
  getTransactionAmount,
  isAddProxyTransaction,
  isManageProxyTransaction,
  isProxyTypeTransaction,
  isRemoveProxyTransaction,
  isRemovePureProxyTransaction,
} from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';
import { NamedAccount } from '@/widgets/NameResolver';

export const proxyOperationDetailFeature = createFeature({
  name: 'proxy/operation-details',
});

const getOperationTitle = (transactionType: TransactionType): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.ADD_PROXY]: t('operations.titles.addProxy'),
    [TransactionType.CREATE_PURE_PROXY]: t('operations.titles.createPureProxy'),
    [TransactionType.REMOVE_PROXY]: t('operations.titles.removeProxy'),
    [TransactionType.KILL_PURE_PROXY]: t('operations.titles.removePureProxy'),
  };

  return Title[transactionType];
};

multisigOperationsSDK(proxyOperationDetailFeature, {
  icon({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    if (isProxyTypeTransaction(transaction)) {
      return 'proxyMst';
    }
  },
  title({ operation, showCoreTransaction }) {
    const { t } = useI18n();
    const chains = useUnit(networkModel.$chains);
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const title = transaction?.type && getOperationTitle(transaction.type);

    if (title) {
      const asset = transaction && getAssetById(transaction.args.asset, chains[operation.chainId]?.assets);
      const amount = transaction && getTransactionAmount(transaction);

      return {
        title: title ? t(title) : undefined,
        amount: asset && amount ? { value: amount, asset } : undefined,
        sourceChainId: operation.chainId,
      };
    }
  },
  logTitle({ operation, showCoreTransaction }) {
    const { t } = useI18n();
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const title = transaction?.type && getOperationTitle(transaction.type);
    if (title) {
      return <TransactionTitle className="overflow-hidden" title={t(title || '')} />;
    }
  },
  details({ operation, showCoreTransaction }) {
    const { t } = useI18n();
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const chains = useUnit(networkModel.$chains);
    const chain = chains[operation.chainId];

    const result = [];

    const delegate = operationDetailsUtils.getDelegate(operation);
    const sender = operationDetailsUtils.getSender(operation);
    const proxyType = operationDetailsUtils.getProxyType(operation);

    if (isAddProxyTransaction(transaction) && delegate) {
      result.push(
        <DetailRow label={t('operation.details.delegateTo')} className="text-text-secondary">
          <NamedAccount accountId={toAccountId(delegate)} variant="short" chain={chain} />
        </DetailRow>,
      );
    }

    if (isRemoveProxyTransaction(transaction) && delegate) {
      result.push(
        <DetailRow label={t('operation.details.revokeFor')} className="text-text-secondary">
          <NamedAccount accountId={toAccountId(delegate)} variant="short" chain={chain} />
        </DetailRow>,
      );
    }

    if (isRemovePureProxyTransaction(transaction) && sender) {
      result.push(
        <DetailRow label={t('operation.details.revokeFor')} className="text-text-secondary">
          <NamedAccount accountId={sender} variant="short" chain={chain} />
        </DetailRow>,
      );
    }

    if (isManageProxyTransaction(transaction) && proxyType) {
      result.push(
        <DetailRow label={t('operation.details.accessType')} className="text-text-secondary">
          <FootnoteText className="text-text-secondary">{t(proxyUtils.getProxyTypeName(proxyType))}</FootnoteText>
        </DetailRow>,
      );
    }

    return <>{result.map((e) => e)}</>;
  },
});
