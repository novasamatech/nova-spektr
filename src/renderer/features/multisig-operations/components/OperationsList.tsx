import { type MultisigTransaction } from '@/shared/core';

import { Operation } from './Operation';

type Props = {
  operations?: MultisigTransaction[];
};

export const OperationList = ({ operations }: Props) => {
  return (
    <nav className="h-full overflow-y-auto">
      <div className="flex h-full flex-col gap-2">
        {operations?.map((op) => (
          <Operation key={`${op.callHash}_${op.indexCreated}_${op.blockCreated}`} operation={op} />
        ))}
      </div>
    </nav>
  );
};
