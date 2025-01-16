import { createEvent, sample } from 'effector';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { multisigsModel } from '@/entities/multisig';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

const rejectMultisig = createEvent<AccountId>();
const failedMultisig = createEvent<AccountId>();

sample({
  clock: [rejectMultisig, failedMultisig],
  source: walletModel.$wallets,
  fn: (wallets, accountId) => {
    const account = walletUtils.getAccountBy(wallets, (account) => account.accountId === accountId);
    if (!account || !accountUtils.isFlexibleMultisigAccount(account)) return null;

    return account;
  },
  target: multisigsModel.events.convertFlexibleToRegular,
});

export const flexibleShellModel = {
  events: {
    rejectMultisig,
    failedMultisig,
  },
};
