import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
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
  title({ operation }) {
    const { t } = useI18n();
    if (isEditFlexibleTransaction(operation.transaction)) {
      return {
        title: t('operations.titles.editFlexible'),
        chainId: operation.chainId,
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
