import { type MultisigTransaction } from '@/shared/core';
import { useSlot } from '@/shared/di';

import { operationDetailsSlot } from './OperationsList';

type Props = {
  operation: MultisigTransaction;
};

export const Operation = ({ operation }: Props) => {
  const operationDetails = useSlot(operationDetailsSlot, { props: { operation } });

  return (
    <nav className="h-full overflow-y-auto">
      <div className="flex h-full flex-col gap-2">{operationDetails}</div>
    </nav>
  );
};
