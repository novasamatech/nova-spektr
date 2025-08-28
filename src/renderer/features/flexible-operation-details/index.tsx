import { createFeature } from '@/shared/feature';
import { findCoreTransaction, isEditFlexibleTransaction } from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';

import { FlexibleOperationTitle } from './components/FlexibleOperationTitle';

export const flexibleOperationDetailFeature = createFeature({
  name: 'flexible/operation-details',
});

multisigOperationsSDK(flexibleOperationDetailFeature, {
  icon({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (isEditFlexibleTransaction(transaction)) {
      return 'proxyMst';
    }
  },
  title({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (isEditFlexibleTransaction(transaction)) {
      return <FlexibleOperationTitle operation={operation} title="operations.titles.editFlexible" />;
    }
  },
  logTitle({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (isEditFlexibleTransaction(transaction)) {
      return <FlexibleOperationTitle operation={operation} title="operations.titles.editFlexible" />;
    }
  },
  details() {
    return null;
  },
});
