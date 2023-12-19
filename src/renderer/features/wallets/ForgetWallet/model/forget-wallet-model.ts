import { createEvent, sample, createEffect, createStore, createApi, attach } from 'effector';

import { Account, MultisigAccount, MultisigWallet, Wallet } from '@shared/core';
import { walletModel, walletUtils } from '@entities/wallet';
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

type DeleteWalletBalancesParams = {
  accounts: Account[];
};

const deleteWalletBalancesFx = createEffect(async ({ accounts }: DeleteWalletBalancesParams): Promise<void> => {
  try {
    await balanceService.deleteBalances(accounts.map((a) => a.accountId));
  } catch (e) {
    console.error(`Error while deleting wallet balances`, e);
  }
});

type ForgetMultisigWalletParams = {
  wallet: MultisigWallet;
  account: MultisigAccount;
};

const deleteMultisigBalancesAndOperationsFx = createEffect(
  async ({ wallet, account }: ForgetMultisigWalletParams): Promise<void> => {
    try {
      await Promise.all([balanceService.deleteBalances([account.accountId]), deleteMultisigTxs(account.accountId)]);
    } catch (e) {
      console.error(`Error while deleting multisig wallet ${wallet.name}`, e);
    }
  },
);

sample({
  clock: forgetWallet,
  source: walletModel.$accounts,
  filter: (_, wallet) => !walletUtils.isMultisig(wallet),
  fn: (accounts, wallet) => {
    return { accounts: accounts.filter((a) => a.walletId === wallet.id) };
  },
  target: deleteWalletBalancesFx,
});

sample({
  clock: forgetWallet,
  source: walletModel.$accounts,
  filter: (_, wallet) => walletUtils.isMultisig(wallet),
  fn: (accounts, wallet) => {
    return { wallet, account: accounts.find((a) => a.walletId === wallet.id) as MultisigAccount };
  },
  target: deleteMultisigBalancesAndOperationsFx,
});

sample({
  clock: forgetWallet,
  fn: (wallet) => wallet.id,
  target: walletModel.events.walletRemoved,
});

sample({
  clock: [walletModel.events.walletRemovedSuccess],
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
