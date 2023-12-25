import { createEvent, sample, createEffect, createStore, createApi, attach, split } from 'effector';

import { AccountId, MultisigAccount, Wallet, WalletType } from '@shared/core';
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

const SIMPLE_WALLETS = [
  WalletType.WATCH_ONLY,
  WalletType.POLKADOT_VAULT,
  WalletType.SINGLE_PARITY_SIGNER,
  WalletType.MULTISHARD_PARITY_SIGNER,
];

split({
  source: forgetWallet,
  match: {
    simpleWallet: (wallet: Wallet) => SIMPLE_WALLETS.includes(wallet.type),
    multisigWallet: (wallet: Wallet) => walletUtils.isMultisig(wallet),
  },
  cases: {
    simpleWallet: forgetSimpleWallet,
    multisigWallet: forgetMultisigWallet,
  },
});

sample({
  clock: [forgetSimpleWallet, forgetMultisigWallet],
  source: walletModel.$accounts,
  fn: (accounts, wallet) => accounts.filter((a) => a.walletId === wallet.id).map((a) => a.accountId),
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
