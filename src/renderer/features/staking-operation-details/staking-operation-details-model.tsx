import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { multisigOperationsFeature } from '@/features/multisig-operations';

import { PayeeOperationDetails } from './components/PayeeOperationDetails';
import { StakingOperationTitle } from './components/StakingOperationTitle';
import { ValidatorsOperationDetails } from './components/ValidatorsOperationDetails';

export const stakingOperationDetailFeature = createFeature({
  name: 'staking/operation-details',
});

stakingOperationDetailFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => {
    const transaction = getTransactionFromMultisigTx(operation);

    if (
      transaction?.type &&
      [
        TransactionType.BOND,
        TransactionType.STAKE_MORE,
        TransactionType.UNSTAKE,
        TransactionType.RESTAKE,
        TransactionType.REDEEM,
      ].includes(transaction.type)
    ) {
      return <PayeeOperationDetails operation={operation} />;
    }

    return null;
  },
  order: 1,
});

stakingOperationDetailFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => {
    const transaction = getTransactionFromMultisigTx(operation);

    if (transaction?.type && [TransactionType.BOND, TransactionType.NOMINATE].includes(transaction.type)) {
      return <ValidatorsOperationDetails operation={operation} />;
    }

    return null;
  },
  order: 2,
});

stakingOperationDetailFeature.inject(multisigOperationsFeature.slots.operationTitle, {
  render: ({ operation }) => {
    const transaction = getTransactionFromMultisigTx(operation);

    if (
      transaction?.type &&
      [
        TransactionType.BOND,
        TransactionType.STAKE_MORE,
        TransactionType.UNSTAKE,
        TransactionType.RESTAKE,
        TransactionType.REDEEM,
        TransactionType.NOMINATE,
        TransactionType.DESTINATION,
      ].includes(transaction.type)
    ) {
      return <StakingOperationTitle tx={operation} />;
    }

    return null;
  },
  order: 1,
});
