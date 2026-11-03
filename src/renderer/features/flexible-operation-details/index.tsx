import { createFeature } from '@/shared/feature';
import { nullable } from '@/shared/lib/utils';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';
import { isProxyEditOperation } from '@/features/multisig-operations';

export const flexibleOperationDetailFeature = createFeature({
  name: 'flexible/operation-details',
});

multisigOperationsSDK(flexibleOperationDetailFeature, {
  icon({ operation }) {
    if (isProxyEditOperation(operation)) {
      return 'proxyMst';
    }
  },
  title({ operation, t }) {
    if (nullable(operation) || nullable(t)) return null;

    if (isProxyEditOperation(operation)) {
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
