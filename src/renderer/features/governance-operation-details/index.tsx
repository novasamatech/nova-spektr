import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { getTransactionType } from '@/entities/transaction';
import { multisigOperationSDK } from '@/sdk/multisig-operation';

import { GovernanceDelegateDetails } from './components/GovernanceDelegateDetails';
import { GovernanceOperationTitle } from './components/GovernanceOperationTitle';
import { GovernanceVoteDetails } from './components/GovernanceVoteDetails';

export const governanceOperationDetailFeature = createFeature({
  name: 'governance/operation-details',
});

multisigOperationSDK(governanceOperationDetailFeature, {
  title({ transaction, chainId, variant }) {
    const transactionType = getTransactionType(transaction.method, transaction.section);

    if (
      transactionType &&
      [TransactionType.UNLOCK, TransactionType.VOTE, TransactionType.REVOTE, TransactionType.REMOVE_VOTE].includes(
        transactionType,
      )
    ) {
      return <GovernanceOperationTitle transaction={transaction} chainId={chainId} variant={variant} />;
    }

    return null;
  },
  details({ transaction, chainId }) {
    const transactionType = getTransactionType(transaction.method, transaction.section);

    if (
      transactionType &&
      [TransactionType.UNLOCK, TransactionType.VOTE, TransactionType.REVOTE, TransactionType.REMOVE_VOTE].includes(
        transactionType,
      )
    ) {
      return <GovernanceVoteDetails transaction={transaction} chainId={chainId} />;
    }

    if (
      transactionType &&
      [TransactionType.DELEGATE, TransactionType.UNDELEGATE, TransactionType.EDIT_DELEGATION].includes(transactionType)
    ) {
      return <GovernanceDelegateDetails transaction={transaction} chainId={chainId} />;
    }

    return null;
  },
});
