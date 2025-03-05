// import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
// import { useI18n } from '@/shared/i18n';
// import { type IconNames } from '@/shared/ui';
// import { operationDetailsUtils } from '@/entities/operations';
// import { TransactionTitle, getTransactionType } from '@/entities/transaction';
// import { logTitleSlot } from '@/features/multisig-operations';

// import { GovernanceDelegateDetails } from './components/GovernanceDelegateDetails';
// import { GovernanceOperationTitle } from './components/GovernanceOperationTitle';
// import { GovernanceVoteDetails } from './components/GovernanceVoteDetails';

export const governanceOperationDetailFeature = createFeature({
  name: 'governance/operation-details',
});

// const getOperationTitle = (transactionType: TransactionType): string | undefined => {
//   const Title: { [key in TransactionType]?: string } = {
//     [TransactionType.UNLOCK]: 'operations.titles.unlock',
//     [TransactionType.VOTE]: 'operations.titles.vote',
//     [TransactionType.REVOTE]: 'operations.titles.revote',
//     [TransactionType.REMOVE_VOTE]: 'operations.titles.removeVote',
//     [TransactionType.DELEGATE]: 'operations.titles.delegate',
//     [TransactionType.UNDELEGATE]: 'operations.titles.undelegate',
//     [TransactionType.EDIT_DELEGATION]: 'operations.titles.editDelegation',
//   };

//   return Title[transactionType];
// };

// const getOperationIcon = (transactionType: TransactionType): IconNames | undefined => {
//   const Title: { [key in TransactionType]?: IconNames } = {
//     [TransactionType.UNLOCK]: 'unlockMst',
//     [TransactionType.VOTE]: 'voteMst',
//     [TransactionType.REVOTE]: 'revoteMst',
//     [TransactionType.REMOVE_VOTE]: 'retractMst',
//     [TransactionType.DELEGATE]: 'delegateMst',
//     [TransactionType.UNDELEGATE]: 'undelegateMst',
//     [TransactionType.EDIT_DELEGATION]: 'editDelegationMst',
//   };

//   return Title[transactionType];
// };

// governanceOperationDetailFeature.inject(operationDetailsSlot, {
//   render: ({ operation }) => {
//     const transaction = operationDetailsUtils.getOperationData(operation);
//     const transactionType = getTransactionType(transaction?.method, transaction?.section);

//     if (
//       transactionType &&
//       [TransactionType.UNLOCK, TransactionType.VOTE, TransactionType.REVOTE, TransactionType.REMOVE_VOTE].includes(
//         transactionType,
//       )
//     ) {
//       return <GovernanceVoteDetails operation={operation} />;
//     }

//     return null;
//   },
//   order: 1,
// });

// governanceOperationDetailFeature.inject(operationDetailsSlot, {
//   render: ({ operation }) => {
//     const transaction = operationDetailsUtils.getOperationData(operation);
//     const transactionType = getTransactionType(transaction?.method, transaction?.section);

//     if (
//       transactionType &&
//       [TransactionType.DELEGATE, TransactionType.UNDELEGATE, TransactionType.EDIT_DELEGATION].includes(transactionType)
//     ) {
//       return <GovernanceDelegateDetails operation={operation} />;
//     }

//     return null;
//   },
//   order: 2,
// });

// governanceOperationDetailFeature.inject(operationTitleSlot, ({ operation }) => {
//   const transaction = operationDetailsUtils.getOperationData(operation);
//   const transactionType = getTransactionType(transaction?.method, transaction?.section);

//   const title = transactionType && getOperationTitle(transactionType);
//   const icon = transactionType && getOperationIcon(transactionType);

//   if (title) {
//     return <GovernanceOperationTitle operation={operation} title={title} icon={icon} />;
//   }

//   return null;
// });

// governanceOperationDetailFeature.inject(logTitleSlot, ({ operation }) => {
//   const { t } = useI18n();
//   const transaction = operationDetailsUtils.getOperationData(operation);
//   const transactionType = getTransactionType(transaction?.method, transaction?.section);

//   const title = transactionType && getOperationTitle(transactionType);
//   const icon = transactionType && getOperationIcon(transactionType);

//   if (title) {
//     return <TransactionTitle className="overflow-hidden" title={t(title || '')} icon={icon} />;
//   }

//   return null;
// });
