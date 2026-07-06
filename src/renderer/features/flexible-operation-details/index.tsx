import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { isEditFlexibleTransaction } from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';

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
  details() {
    return null;
  },
});
