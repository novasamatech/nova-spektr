// import { useUnit } from 'effector-react';

// import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
// import { useI18n } from '@/shared/i18n';
// import { toAccountId } from '@/shared/lib/utils';
// import { DetailRow, FootnoteText } from '@/shared/ui';
// import { Account } from '@/shared/ui-entities';
// import { networkModel } from '@/entities/network';
// import { operationDetailsUtils } from '@/entities/operations';
// import { proxyUtils } from '@/entities/proxy';
// import {
//   TransactionTitle,
//   getTransactionType,
// isAddProxyTransaction,
// isManageProxyTransaction,
// isRemoveProxyTransaction,
// isRemovePureProxyTransaction,
// } from '@/entities/transaction';
// import { logTitleSlot } from '@/features/multisig-operations';

// import { ProxyOperationTitle } from './components/ProxyOperationTitle';

export const proxyOperationDetailFeature = createFeature({
  name: 'proxy/operation-details',
});

// const getOperationTitle = (transactionType: TransactionType): string | undefined => {
//   const Title: { [key in TransactionType]?: string } = {
//     [TransactionType.ADD_PROXY]: 'operations.titles.addProxy',
//     [TransactionType.CREATE_PURE_PROXY]: 'operations.titles.createPureProxy',
//     [TransactionType.REMOVE_PROXY]: 'operations.titles.removeProxy',
//     [TransactionType.REMOVE_PURE_PROXY]: 'operations.titles.removePureProxy',
//   };

//   return Title[transactionType];
// };

// proxyOperationDetailFeature.inject(operationDetailsSlot, {
//   render: ({ operation }) => {
//     const { t } = useI18n();
//     const transaction = operationDetailsUtils.getOperationData(operation);
//     const chains = useUnit(networkModel.$chains);
//     const chain = chains[operation.chainId];

//     const result = [];

//     const delegate = operationDetailsUtils.getDelegate(operation);
//     const sender = operationDetailsUtils.getSender(operation);
//     const proxyType = operationDetailsUtils.getProxyType(operation);

//     if (isAddProxyTransaction(transaction) && delegate) {
//       result.push(
//         <DetailRow label={t('operation.details.delegateTo')} className="text-text-secondary">
//           <Account accountId={toAccountId(delegate)} variant="short" chain={chain} />
//         </DetailRow>,
//       );
//     }

//     if (isRemoveProxyTransaction(transaction) && delegate) {
//       result.push(
//         <DetailRow label={t('operation.details.revokeFor')} className="text-text-secondary">
//           <Account accountId={toAccountId(delegate)} variant="short" chain={chain} />
//         </DetailRow>,
//       );
//     }

//     if (isRemovePureProxyTransaction(transaction) && sender) {
//       result.push(
//         <DetailRow label={t('operation.details.revokeFor')} className="text-text-secondary">
//           <Account accountId={sender} variant="short" chain={chain} />
//         </DetailRow>,
//       );
//     }

//     if (isManageProxyTransaction(transaction) && proxyType) {
//       result.push(
//         <DetailRow label={t('operation.details.accessType')} className="text-text-secondary">
//           <FootnoteText className="text-text-secondary">{t(proxyUtils.getProxyTypeName(proxyType))}</FootnoteText>
//         </DetailRow>,
//       );
//     }

//     return <>{result.map((e) => e)}</>;
//   },
//   order: 1,
// });

// proxyOperationDetailFeature.inject(operationTitleSlot, ({ operation }) => {
//   const transaction = operationDetailsUtils.getOperationData(operation);
//   const transactionType = getTransactionType(transaction?.method, transaction?.section);

//   const title = transactionType && getOperationTitle(transactionType);

//   if (title) {
//     return <ProxyOperationTitle operation={operation} title={title} />;
//   }

//   return null;
// });

// proxyOperationDetailFeature.inject(logTitleSlot, ({ operation }) => {
//   const { t } = useI18n();
//   const transaction = operationDetailsUtils.getOperationData(operation);
//   const transactionType = getTransactionType(transaction?.method, transaction?.section);

//   const title = transactionType && getOperationTitle(transactionType);

//   if (title) {
//     return <TransactionTitle className="overflow-hidden" title={t(title || '')} icon="proxyMst" />;
//   }

//   return null;
// });
