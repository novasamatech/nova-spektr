import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/effector';
// TODO: fix import
import { multisigOperationsFeature } from '@/features/multisig-operations';

import { BondOperationDetails } from './components/BondOperationDetails';
import { BondOperationTitle } from './components/BondOperationTitle';

export const bondOperationDetailFeature = createFeature({
  name: 'Bond operation details',
});

bondOperationDetailFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => {
    const transaction = operation.transaction;

    if (transaction?.type === TransactionType.BOND) {
      return <BondOperationDetails operation={operation} />;
    }

    return null;
  },
  order: 1,
});

bondOperationDetailFeature.inject(multisigOperationsFeature.slots.operationTitle, ({ operation }) => {
  if (operation.transaction?.type === TransactionType.BOND) {
    return <BondOperationTitle tx={operation} />;
  }

  return null;
});
