import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { isEditFlexibleTransaction } from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';

import { FlexibleOperationTitle } from './components/FlexibleOperationTitle';

export const flexibleOperationDetailFeature = createFeature({
  name: 'flexible/operation-details',
});

multisigOperationsSDK(flexibleOperationDetailFeature, {
  icon({ operation }) {
    if (isEditFlexibleTransaction(operation.transaction)) {
      return 'proxyMst';
    }
  },
  title({ operation, t }) {
    if (nullable(operation) || nullable(t)) return null;

    if (isEditFlexibleTransaction(operation.transaction)) {
      return {
        title: t('operations.titles.editFlexible'),
        sourceChainId: operation.chainId,
      };
    }
  },
  logTitle({ operation }) {
    if (isEditFlexibleTransaction(operation.transaction)) {
      return <FlexibleOperationTitle operation={operation} title="operations.titles.editFlexible" />;
    }
  },
  details() {
    return null;
  },
});
