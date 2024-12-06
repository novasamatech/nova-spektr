import { useUnit } from 'effector-react';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { proxyUtils } from '@/entities/proxy';
import {
  isAddProxyTransaction,
  isManageProxyTransaction,
  isRemoveProxyTransaction,
  isRemovePureProxyTransaction,
} from '@/entities/transaction';
import { multisigOperationsFeature } from '@/features/multisig-operations';

import { ProxyOperationTitle } from './components/ProxyOperationTitle';

export const proxyOperationDetailFeature = createFeature({
  name: 'proxy/operation-details',
});

proxyOperationDetailFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => {
    const { t } = useI18n();
    const transaction = getTransactionFromMultisigTx(operation);
    const chains = useUnit(networkModel.$chains);
    const chain = chains[operation.chainId];

    const result = [];

    const delegate = operationDetailsUtils.getDelegate(operation);
    const sender = operationDetailsUtils.getSender(operation);
    const proxyType = operationDetailsUtils.getProxyType(operation);

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
          <Account accountId={toAccountId(sender)} variant="short" chain={chain} />
        </DetailRow>,
      );
    }

    if (isManageProxyTransaction(transaction) && proxyType) {
      result.push(
        <DetailRow label={t('operation.details.accessType')} className="text-text-secondary">
          <FootnoteText>{t(proxyUtils.getProxyTypeName(proxyType))}</FootnoteText>
        </DetailRow>,
      );
    }

    return <>{result.map((e) => e)}</>;
  },
  order: 1,
});

proxyOperationDetailFeature.inject(multisigOperationsFeature.slots.operationTitle, ({ operation }) => {
  const transaction = getTransactionFromMultisigTx(operation);

  if (
    transaction?.type &&
    [
      TransactionType.ADD_PROXY,
      TransactionType.REMOVE_PROXY,
      TransactionType.CREATE_PURE_PROXY,
      TransactionType.REMOVE_PURE_PROXY,
    ].includes(transaction.type)
  ) {
    return <ProxyOperationTitle tx={operation} />;
  }

  return null;
});
