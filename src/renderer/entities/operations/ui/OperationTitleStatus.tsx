import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

import { Status } from './Status';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount | null;
  accounts: AnyAccount[];
};

export const OperationTitleStatus = ({ operation, account, accounts }: Props) => {
  const events = operation.events;

  const approvals = events.filter((e) => e.status === 'approve');
  const threshold = account ? accountUtils.getMultisigThreshold(account, accounts) : 0;

  return (
    <div className="mx-3 flex w-[120px] shrink-0 justify-end">
      <Status status={operation.status} signed={approvals.length} threshold={threshold} />
    </div>
  );
};
