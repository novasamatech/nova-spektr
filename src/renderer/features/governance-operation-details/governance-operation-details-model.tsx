import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { multisigOperationsFeature } from '@/features/multisig-operations';

import { GovernanceDelegateDetails } from './components/GovernanceDelegateDetails';
import { GovernanceOperationTitle } from './components/GovernanceOperationTitle';
import { GovernanceVoteDetails } from './components/GovernanceVoteDetails';

export const governanceOperationDetailFeature = createFeature({
  name: 'governance/operation-details',
});

governanceOperationDetailFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => <GovernanceVoteDetails operation={operation} />,
  order: 1,
});

governanceOperationDetailFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => <GovernanceDelegateDetails operation={operation} />,
  order: 1,
});

governanceOperationDetailFeature.inject(multisigOperationsFeature.slots.operationTitle, ({ operation }) => {
  const transaction = getTransactionFromMultisigTx(operation);

  if (
    transaction?.type &&
    [
      TransactionType.UNLOCK,
      TransactionType.VOTE,
      TransactionType.REVOTE,
      TransactionType.REMOVE_VOTE,
      TransactionType.DELEGATE,
      TransactionType.UNDELEGATE,
      TransactionType.EDIT_DELEGATION,
    ].includes(transaction.type)
  ) {
    return <GovernanceOperationTitle operation={operation} />;
  }

  return null;
});
