import { createEvent, sample, createEffect, createStore, createApi, attach, split } from 'effector';

import { AccountId, MultisigAccount, Wallet } from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { useBalanceService } from '@entities/balance';
import { useForgetMultisig } from '@entities/multisig';

const balanceService = useBalanceService();
const { deleteMultisigTxs } = useForgetMultisig();

export type Callbacks = {
  onDeleteFinished: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const forgetWallet = createEvent<Wallet>();
const forgetSimpleWallet = createEvent<Wallet>();
const forgetMultisigWallet = createEvent<Wallet>();

const deleteWalletBalancesFx = createEffect(async (accountsIds: AccountId[]): Promise<void> => {
  try {
    await balanceService.deleteBalances(accountsIds);
  } catch (e) {
    console.error(`Error while deleting wallet balances`, e);
  }
});

const deleteMultisigOperationsFx = createEffect(async (account: MultisigAccount): Promise<void> => {
  try {
    await deleteMultisigTxs(account.accountId);
  } catch (e) {
    console.error(`Error while deleting multisig wallet with id ${account.walletId}`, e);
  }
});

split({
  source: forgetWallet,
  match: {
    multisigWallet: (wallet: Wallet) => walletUtils.isMultisig(wallet),
  },
  cases: {
    multisigWallet: forgetMultisigWallet,
    __: forgetSimpleWallet,
  },
});

sample({
  clock: [forgetSimpleWallet, forgetMultisigWallet],
  source: walletModel.$accounts,
  fn: (accounts, wallet) => accountUtils.getWalletAccounts(wallet.id, accounts).map((a) => a.accountId),
  target: deleteWalletBalancesFx,
});

sample({
  clock: forgetMultisigWallet,
  source: walletModel.$accounts,
  fn: (accounts, wallet) => accounts.find((a) => a.walletId === wallet.id) as MultisigAccount,
  target: deleteMultisigOperationsFx,
});

sample({
  clock: forgetWallet,
  fn: (wallet) => wallet.id,
  target: walletModel.events.walletRemoved,
});

sample({
  clock: walletModel.events.walletRemovedSuccess,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onDeleteFinished(),
  }),
});

export const forgetWalletModel = {
  events: {
    forgetWallet,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
