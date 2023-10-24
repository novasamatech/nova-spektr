import { combine, createEvent, createStore, forward, sample } from 'effector';

import { walletModel } from '@renderer/entities/wallet';
import { walletSelectModel } from '@renderer/features/wallets';
import { Account, Wallet } from '@renderer/shared/core';
import { ForgetStep } from '../lib/constants';

const reset = createEvent();
const forgetButtonClicked = createEvent();
const forgetModalClosed = createEvent();

const $forgetStep = createStore<ForgetStep>(ForgetStep.NOT_STARTED).reset(reset);

const $accounts = combine(
  {
    details: walletSelectModel.$walletForDetails,
    accounts: walletModel.$accounts,
  },
  ({ details, accounts }): Account[] => {
    if (!details) return [];

    return accounts.filter((account) => account.walletId === details.id);
  },
);

sample({
  clock: forgetButtonClicked,
  fn: () => ForgetStep.FORGETTING,
  target: $forgetStep,
});

sample({
  clock: forgetButtonClicked,
  source: walletSelectModel.$walletForDetails,
  filter: (wallet): wallet is Wallet => wallet !== null,
  target: walletModel.events.walletRemoved,
});

sample({
  clock: walletModel.events.walletRemovedSuccess,
  fn: () => ForgetStep.SUCCESS,
  target: $forgetStep,
});

forward({
  from: forgetModalClosed,
  to: walletSelectModel.events.walletForDetailsCleared,
});

export const walletProviderModel = {
  $accounts,
  $forgetStep,
  events: {
    reset,
    forgetButtonClicked,
    forgetModalClosed,
  },
};
