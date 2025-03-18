import { useUnit } from 'effector-react';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { proxyUtils } from '@/entities/proxy';
import {
  getTransactionType,
  isAddProxyTransaction,
  isManageProxyTransaction,
  isRemoveProxyTransaction,
  isRemovePureProxyTransaction,
} from '@/entities/transaction';
import { multisigOperationSDK } from '@/sdk/multisig-operation';
import { operationDetailsSlot } from '@/features/multisig-operations';
import { proxyService } from '@/features/proxied-wallet';

export const proxyOperationDetailFeature = createFeature({
  name: 'proxy/operation-details',
});

const getOperationTitle = (transactionType: TransactionType): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.ADD_PROXY]: 'operations.titles.addProxy',
    [TransactionType.CREATE_PURE_PROXY]: 'operations.titles.createPureProxy',
    [TransactionType.REMOVE_PROXY]: 'operations.titles.removeProxy',
    [TransactionType.REMOVE_PURE_PROXY]: 'operations.titles.removePureProxy',
  };

  return Title[transactionType];
};

multisigOperationSDK(proxyOperationDetailFeature, {
  icon(transaction) {
    const type = getTransactionType(transaction?.method, transaction?.section);
    if (
      type === TransactionType.PROXY ||
      type === TransactionType.ADD_PROXY ||
      type === TransactionType.REMOVE_PROXY ||
      type === TransactionType.CREATE_PURE_PROXY ||
      type === TransactionType.REMOVE_PURE_PROXY
    ) {
      return 'proxyMst';
    }
  },
  details({ transaction, chainId, multisigAccountId }) {
    const { t } = useI18n();
    const chains = useUnit(networkModel.$chains);
    const apis = useUnit(networkModel.$apis);
    const chain = chains[chainId];
    const api = apis[chainId];

    const result = [];

    if (proxyService.isProxyTransaction(transaction) && api) {
      try {
        result.push(
          operationDetailsSlot.render({
            transaction: transactionService.decodeTransaction(transaction.args.call, api),
            chainId,
            multisigAccountId,
          }),
        );
      } catch {}
    }

    const delegate = transaction.args.delegate;
    const sender = multisigAccountId;
    const proxyType = transaction.args.proxyType;

    if (isAddProxyTransaction(transaction) && delegate) {
      result.push(
        <DetailRow label={t('operation.details.delegateTo')} className="text-text-secondary">
          <Account accountId={toAccountId(delegate)} variant="short" chain={chain} />
        </DetailRow>,
      );
    }

    if (isRemoveProxyTransaction(transaction) && delegate) {
      result.push(
        <DetailRow label={t('operation.details.revokeFor')} className="text-text-secondary">
          <Account accountId={toAccountId(delegate)} variant="short" chain={chain} />
        </DetailRow>,
      );
    }

    if (isRemovePureProxyTransaction(transaction) && sender) {
      result.push(
        <DetailRow label={t('operation.details.revokeFor')} className="text-text-secondary">
          <Account accountId={sender} variant="short" chain={chain} />
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

    return <>{result}</>;
  },
});
