import { createEvent, restore, sample } from 'effector';

import { multisigsModel } from '@/entities/multisig-accounts';
import { walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

import { operationsContextModel } from './context';
import { rejectModel } from './reject-model';

const rejectMultisig = createEvent();
const toggleRejectModalConfirm = createEvent<boolean>();

const $isRejectConfirmOpen = restore(toggleRejectModalConfirm, false);

sample({
  clock: rejectMultisig,
  source: { account: operationsContextModel.$account, wallet: walletSelect.$selectedWallet },
  filter: ({ wallet }) => walletUtils.isFlexibleMultisig(wallet) && !wallet.activated,
  fn: ({ account }) => account,
  target: multisigsModel.convertFlexibleToRegular,
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
