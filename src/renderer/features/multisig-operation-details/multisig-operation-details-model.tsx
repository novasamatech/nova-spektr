import { createFeature } from '@/shared/feature';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { ChainTitle } from '@/entities/chain';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { TransactionTitle } from '@/entities/transaction';
import { multisigOperationsFeature } from '@/features/multisig-operations';

import { OperationAdvancedDetails } from './components/OperationAdvancedDetails';
import { OperationDetails } from './components/OperationDetails';

export const multisigOperationDetailsFeature = createFeature({
  name: 'multisig/operation details',
});

multisigOperationDetailsFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => <OperationDetails operation={operation} />,
  order: 0,
});

multisigOperationDetailsFeature.inject(multisigOperationsFeature.slots.operationTitle, ({ operation }) => {
  const transaction = getTransactionFromMultisigTx(operation);

  if (transaction && transaction.type) return null;

  const title = transaction && formatSectionAndMethod(transaction.section, transaction.method);

  return (
    <>
      <TransactionTitle className="flex-1 overflow-hidden" title={title || ''} icon="unknownMst" />

      <ChainTitle chainId={operation.chainId} className="w-[114px]" />
    </>
  );
});

multisigOperationDetailsFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => <OperationAdvancedDetails operation={operation} />,
  order: 999,
});

multisigOperationDetailsFeature.inject(multisigOperationsFeature.slots.logTitle, ({ operation }) => {
  const transaction = getTransactionFromMultisigTx(operation);

  if (transaction && transaction.type) return null;

  const title = transaction && formatSectionAndMethod(transaction.section, transaction.method);

  return <TransactionTitle className="overflow-hidden" title={title || ''} icon="unknownMst" />;
});
