import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { getTransactionType } from '@/entities/transaction';
import { multisigOperationSDK } from '@/sdk/multisig-operation';
import { type IconNames } from '../../shared/ui';

import { GovernanceDelegateDetails } from './components/GovernanceDelegateDetails';
import { GovernanceVoteDetails } from './components/GovernanceVoteDetails';

export const governanceOperationDetailFeature = createFeature({
  name: 'governance/operation-details',
});

const getOperationIcon = (transactionType: TransactionType): IconNames | undefined => {
  const Title: { [key in TransactionType]?: IconNames } = {
    [TransactionType.UNLOCK]: 'unlockMst',
    [TransactionType.VOTE]: 'voteMst',
    [TransactionType.REVOTE]: 'revoteMst',
    [TransactionType.REMOVE_VOTE]: 'retractMst',
    [TransactionType.DELEGATE]: 'delegateMst',
    [TransactionType.UNDELEGATE]: 'undelegateMst',
    [TransactionType.EDIT_DELEGATION]: 'editDelegationMst',
  };

  return Title[transactionType];
};

multisigOperationSDK(governanceOperationDetailFeature, {
  icon({ operation }) {
    const transactionType = getTransactionType(operation.method, operation.section);
    return transactionType ? getOperationIcon(transactionType) : undefined;
  },
  additionalInfo({ operation }) {
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
