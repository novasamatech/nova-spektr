import { createEvent, createStore } from 'effector';

import { type Wallet } from '@/shared/core';

// Holds the wallet whose details modal is open. Lifted out of the wallet-actions
// slot so closing the wallet selector Popover (which unmounts that slot) doesn't
// also unmount the modal mid-open.
const requested = createEvent<Wallet>();
const closed = createEvent();

const $wallet = createStore<Wallet | null>(null)
  .on(requested, (_, wallet) => wallet)
  .reset(closed);

export const viewDetailsModel = {
  $wallet,
  requested,
  closed,
};
