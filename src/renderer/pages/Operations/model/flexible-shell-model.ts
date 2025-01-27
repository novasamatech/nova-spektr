import { createEvent, restore, sample } from 'effector';

import { type ChainId, type FlexibleMultisigAccount } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { multisigsModel } from '@/entities/multisig';
import { accountUtils } from '@/entities/wallet';

import { rejectModel } from './reject-model';

const rejectMultisig = createEvent<{ accountId: AccountId; chainId: ChainId }>();
const toggleRejectModalConfirm = createEvent<boolean>();

const $isRejectConfirmOpen = restore(toggleRejectModalConfirm, false);

sample({
  clock: rejectMultisig,
  source: accounts.$list,
  fn: (accounts, { accountId, chainId }) => {
    // TODO: this should be triggered only for the flexible shell state 
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

sample({
  clock: rejectModel.flow.close,
  fn: () => false,
  target: toggleRejectModalConfirm,
});

export const flexibleShellModel = {
  $isRejectConfirmOpen,

  events: {
    rejectMultisig,
    toggleRejectModalConfirm,
  },
};
