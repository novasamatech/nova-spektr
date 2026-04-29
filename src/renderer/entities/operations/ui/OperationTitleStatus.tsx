import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { type MultisigOperation } from '@/domains/network';

import { Status } from './Status';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount | null;
};

export const OperationTitleStatus = ({ operation, account }: Props) => {
  const events = operation.events;

  const approvals = events.filter((e) => e.status === 'approve');

  return (
    <div className="mx-3 flex w-[110px] shrink-0 justify-end">
      <Status status={operation.status} signed={approvals.length} threshold={account?.threshold || 0} />
    </div>
  );
};
