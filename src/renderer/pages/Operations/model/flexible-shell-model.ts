import { createEvent, sample } from 'effector';

import { type ChainId, type FlexibleMultisigAccount } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { multisigsModel } from '@/entities/multisig';
import { accountUtils } from '@/entities/wallet';

const rejectMultisig = createEvent<{ accountId: AccountId; chainId: ChainId }>();

sample({
  clock: rejectMultisig,
  source: accounts.$list,
  fn: (accounts, { accountId, chainId }) => {
    const account = accounts.find(
      (acc) =>
        acc.accountId === accountId &&
        accountUtils.isFlexibleMultisigAccount(acc) &&
        accountUtils.isChainIdMatch(acc, chainId),
    );

    if (nullable(account)) return null;

    return account as FlexibleMultisigAccount;
  },
  target: multisigsModel.events.convertFlexibleToRegular,
});

export const flexibleShellModel = {
  events: {
    rejectMultisig,
  },
};
