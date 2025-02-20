import { type MultisigTransaction } from '@/shared/core';
import { createSlot, useSlot } from '@/shared/di';

type Props = {
  operation: MultisigTransaction;
};

export const operationDetailsSlot = createSlot<{ operation: MultisigTransaction }>();
export const operationTitleSlot = createSlot<{ operation: MultisigTransaction }>();

// TODO: Temp solution
export const Operation = ({ operation }: Props) => {
  const operationDetails = useSlot(operationDetailsSlot, { props: { operation } });
  const operationTitle = useSlot(operationTitleSlot, { props: { operation } });

  return (
    <nav className="h-full overflow-y-auto">
      {operationTitle}
      <div className="flex h-full flex-col gap-2">{operationDetails}</div>
    </nav>
  );
};
