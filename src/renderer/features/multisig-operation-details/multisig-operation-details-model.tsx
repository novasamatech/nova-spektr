import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { ChainTitle } from '@/entities/chain';
import { operationDetailsUtils } from '@/entities/operations';
import { TransactionTitle, getTransactionType } from '@/entities/transaction';
import { logTitleSlot, operationDetailsSlot, operationTitleSlot } from '@/features/multisig-operations';

import { OperationAdvancedDetails } from './components/OperationAdvancedDetails';
import { OperationDetails } from './components/OperationDetails';

export const multisigOperationDetailsFeature = createFeature({
  name: 'multisig/operation details',
});

multisigOperationDetailsFeature.inject(operationDetailsSlot, {
  render: ({ operation }) => <OperationDetails operation={operation} />,
  order: 0,
});

multisigOperationDetailsFeature.inject(operationTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = operationDetailsUtils.getOperationData(operation);
  const transactionType = getTransactionType(transaction?.method, transaction?.section);
  if (transactionType) return null;

  const title =
    operation && operation.section && operation.method && formatSectionAndMethod(operation.section, operation.method);

  return (
    <>
      <TransactionTitle
        className="flex-1 overflow-hidden"
        title={title || t('operations.titles.unknown')}
        icon="unknownMst"
      />

      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
});

multisigOperationDetailsFeature.inject(operationDetailsSlot, {
  render: ({ operation }) => <OperationAdvancedDetails operation={operation} />,
  order: 999,
});

multisigOperationDetailsFeature.inject(logTitleSlot, ({ operation }) => {
  const { t } = useI18n();

  const transaction = operationDetailsUtils.getOperationData(operation);
  const transactionType = getTransactionType(transaction?.method, transaction?.section);
  if (transactionType) return null;

  const title =
    operation && operation.section && operation.method && formatSectionAndMethod(operation.section, operation.method);

  return (
    <TransactionTitle className="overflow-hidden" title={title || t('operations.titles.unknown')} icon="unknownMst" />
  );
});
