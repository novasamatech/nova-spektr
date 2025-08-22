import { createEvent, restore, sample } from 'effector';

import { series } from '@/shared/effector';
import { walletModel } from '@/entities/wallet';
import { balanceSubModel } from '@/features/assets-balances';

export type Callbacks = {
  onClose: () => void;
};

const changeQuery = createEvent<string>();

const $query = restore(changeQuery, '');

const fetchWallets = createEvent();

sample({
  clock: changeQuery,
  target: $query,
});

sample({
  clock: fetchWallets,
  source: walletModel.$allWallets,
  target: series(balanceSubModel.fetchWallet),
});

export const walletList = {
  $query,

  changeQuery,
  fetchWallets,
};
