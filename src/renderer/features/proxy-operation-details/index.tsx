import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { DetailRow, FootnoteText, type IconNames } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { transactionService } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { proxyUtils } from '@/entities/proxy';
import {
  getTransactionType,
  isAddProxyTransaction,
  isManageProxyTransaction,
  isRemoveProxyTransaction,
  isRemovePureProxyTransaction,
  types,
} from '@/entities/transaction';
import { multisigOperationSDK } from '@/sdk/multisig-operation';
import { OperationDetails } from '@/features/multisig-operations';

export const proxyOperationDetailFeature = createFeature({
  name: 'proxy/operation-details',
});

const getOperationTitle = (type: TransactionType): string | undefined => {
  const titles: { [key in TransactionType]?: string } = {
    [TransactionType.ADD_PROXY]: 'operations.titles.addProxy',
    [TransactionType.CREATE_PURE_PROXY]: 'operations.titles.createPureProxy',
    [TransactionType.REMOVE_PROXY]: 'operations.titles.removeProxy',
    [TransactionType.REMOVE_PURE_PROXY]: 'operations.titles.removePureProxy',
  };

  return titles[type];
};

const getOperationIcon = (type: TransactionType): IconNames | undefined => {
  if (
    type === TransactionType.PROXY ||
    type === TransactionType.ADD_PROXY ||
    type === TransactionType.REMOVE_PROXY ||
    type === TransactionType.CREATE_PURE_PROXY ||
    type === TransactionType.REMOVE_PURE_PROXY
  ) {
    return 'proxyMst';
  }
};

multisigOperationSDK(proxyOperationDetailFeature, {
  icon({ method, section }) {
    const type = getTransactionType(method, section);
    if (type) {
      return getOperationIcon(type);
    }
  },
  title({ method, section }) {
    const type = getTransactionType(method, section);
    if (type) {
      return getOperationTitle(type);
    }
  },
  additionalInfo({ chainId }) {
    return <ChainTitle chainId={chainId} className="w-[114px]" />;
  },
  details({ transaction, chainId, multisigAccountId }) {
    const { t } = useI18n();
    const chains = useUnit(networkModel.$chains);
    const apis = useUnit(networkModel.$apis);
    const chain = chains[chainId];
    const api = apis[chainId];

    let result: ReactNode[] = [];

    if (types.isProxyProxyTransaction(transaction) && api) {
      try {
        const unwrapped = transactionService.decodeTransaction(transaction.args.call, api);
        if (transactionService.isBatchTransaction(unwrapped)) {
          const nodes = unwrapped.args.calls.map((transaction, index) => (
            <OperationDetails key={index} titled transaction={transaction} chainId={chainId} />
          ));

          result = result.concat(nodes);
        } else {
          result.push(<OperationDetails titled transaction={unwrapped} chainId={chainId} />);
        }
      } catch (e) {
        console.error(e);
      }
    }

    const delegate = operationDetailsUtils.getDelegate(transaction);
    const sender = multisigAccountId;
    const proxyType = operationDetailsUtils.getProxyType(transaction);

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

    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{result}</>;
  },
});
