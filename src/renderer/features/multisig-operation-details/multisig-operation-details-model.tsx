import { createFeature } from '@/shared/feature';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { ChainTitle } from '@/entities/chain';
import { TransactionTitle } from '@/entities/transaction';
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
  const transaction = operation.transaction;

  if (transaction && transaction.type) return null;

  const title = transaction && formatSectionAndMethod(transaction.section, transaction.method);

  return (
    <>
      <TransactionTitle className="flex-1 overflow-hidden" title={title || ''} icon="unknownMst" />

      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
});

multisigOperationDetailsFeature.inject(operationDetailsSlot, {
  render: ({ operation }) => <OperationAdvancedDetails operation={operation} />,
  order: 999,
});

multisigOperationDetailsFeature.inject(logTitleSlot, ({ operation }) => {
  const transaction = operation.transaction;

  if (transaction && transaction.type) return null;

  const title = transaction && formatSectionAndMethod(transaction.section, transaction.method);

  return <TransactionTitle className="overflow-hidden" title={title || ''} icon="unknownMst" />;
});
