import { useStoreMap, useUnit } from 'effector-react';

import { type MultisigTransaction } from '@/shared/core';
import { accountUtils, walletModel } from '@/entities/wallet';
import { operationsModel } from '../model/operations-model';

import { Status } from './Status';

type Props = {
  operation: MultisigTransaction;
};

export const OperationTitleStatus = ({ operation }: Props) => {
  const events = useStoreMap({
    store: operationsModel.$multisigEvents,
    keys: [operation],
    fn: (events, [operation]) => {
      return events.filter(
        (e) =>
          e.txAccountId === operation.accountId &&
          e.txChainId === operation.chainId &&
          e.txCallHash === operation.callHash &&
          e.txBlock === operation.blockCreated &&
          e.txIndex === operation.indexCreated,
      );
    },
  });

  const approvals = events.filter((e) => e.status === 'SIGNED');
  const activeWallet = useUnit(walletModel.$activeWallet);
  const account = activeWallet?.accounts.find(accountUtils.isMultisigAccount);

  return (
    <div className="flex w-[120px] justify-end">
      <Status status={operation.status} signed={approvals.length} threshold={account?.threshold || 0} />
    </div>
  );
};
