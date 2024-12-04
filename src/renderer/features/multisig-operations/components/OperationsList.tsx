import { memo } from 'react';

import { type MultisigTransaction } from '@/shared/core';
import { createSlot } from '@/shared/di';

import { Operation } from './Operation';

type SlotProps = {
  operation: MultisigTransaction;
};

export const operationDetailsSlot = createSlot<SlotProps>();
export const operationTitleSlot = createSlot<SlotProps>();

type Props = {
  operations?: MultisigTransaction[];
};

export const OperationList = memo(({ operations }: Props) => {
  return (
    <nav className="h-full overflow-y-auto">
      <div className="flex h-full flex-col gap-2">
        {operations?.map((op) => (
          <Operation key={`${op.callHash}_${op.indexCreated}_${op.blockCreated}`} operation={op} />
        ))}
      </div>
    </nav>
  );
});
