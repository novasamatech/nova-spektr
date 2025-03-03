import { useUnit } from 'effector-react';

import { type MultisigOperation } from '@/domains/multisig';
import { accountUtils, walletModel } from '@/entities/wallet';

import { Status } from './Status';

type Props = {
  operation: MultisigOperation;
};

export const OperationTitleStatus = ({ operation }: Props) => {
  const { events } = operation;

  const approvals = events.filter((e) => e.status === 'approve');
  const activeWallet = useUnit(walletModel.$activeWallet);
  const account = activeWallet?.accounts.find(accountUtils.isMultisigAccount);

  return (
    <div className="flex w-[120px] justify-end">
      <Status status={operation.status} signed={approvals.length} threshold={account?.threshold || 0} />
    </div>
  );
};
