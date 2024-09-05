import { type Store, combine, createEvent, createStore, sample } from 'effector';

import { type Account, type Chain, type ID, type ProxiedAccount, type Wallet } from '@shared/core';
import { toAddress } from '@shared/lib/utils';
import { type WrappedTransactions, isProxyTransaction } from '@entities/transaction';
import { walletUtils } from '@entities/wallet';

export type ConfirmInfo = {
  id?: number;
  account: Account;
  signatory?: Account;
  description: string;
  chain: Chain;
  wrappedTransactions: WrappedTransactions;
};

export type ConfirmItem<Input extends ConfirmInfo = ConfirmInfo> = {
  meta: Input;
  wallets: {
    initiator: Wallet;
    proxy: Wallet | null;
    signer: Wallet | null;
  };
  accounts: {
    initiator: Account;
    proxy?: ProxiedAccount | null;
    signer: Account | null;
  };
};

type Params = {
  $wallets: Store<Wallet[]>;
};

export const createTransactionConfirmStore = <Input extends ConfirmInfo>({ $wallets }: Params) => {
  type ConfirmMap = Record<ID, ConfirmItem<Input>>;

  const fillConfirm = createEvent<Input[]>();
  const addConfirms = createEvent<Input>();
  const replaceWithConfirm = createEvent<Input>();
  const resetConfirm = createEvent();

  const $store = createStore<Input[]>([]);

  const $confirmMap = combine($store, $wallets, (store, wallets) => {
    if (!wallets.length) return {};

    return store.reduce<ConfirmMap>((acc, meta, index) => {
      const { wrappedTransactions, chain } = meta;
      const { wrappedTx, coreTx } = wrappedTransactions;
      const { addressPrefix } = chain;

      const initiatorAccount = walletUtils.getAccountBy(wallets, (account, wallet) => {
        const isSameAccount = coreTx.address === toAddress(account.accountId, { prefix: addressPrefix });

        if (isProxyTransaction(wrappedTx)) {
          return walletUtils.isProxied(wallet) && isSameAccount;
        }

        return isSameAccount;
      });
      if (!initiatorAccount) return acc;

      const initiatorWallet = walletUtils.getWalletFilteredAccounts(wallets, {
        walletFn: (wallet) => !isProxyTransaction(wrappedTx) || walletUtils.isProxied(wallet),
        accountFn: (account) => initiatorAccount.accountId === account.accountId,
      });
      if (!initiatorWallet) return acc;

      const signerAccount = walletUtils.getAccountBy(
        wallets,
        (account, wallet) =>
          !walletUtils.isProxied(wallet) &&
          wrappedTx.address === toAddress(account.accountId, { prefix: addressPrefix }),
      );
      const signerWallet = walletUtils.getWalletFilteredAccounts(wallets, {
        walletFn: (wallet) => !walletUtils.isProxied(wallet),
        accountFn: (account) => signerAccount?.accountId === account.accountId,
      });

      const pAccount = walletUtils.getAccountBy(
        wallets,
        (account, wallet) =>
          !walletUtils.isProxied(wallet) &&
          isProxyTransaction(wrappedTx) &&
          wrappedTx.address === toAddress(account.accountId, { prefix: addressPrefix }),
      ) as ProxiedAccount | null;
      const pWallet = walletUtils.getWalletFilteredAccounts(wallets, {
        accountFn: (account) => pAccount?.accountId === account.accountId,
      });

      acc[meta.id ?? index] = {
        meta,
        wallets: {
          signer: signerWallet || null,
          initiator: initiatorWallet,
          proxy: pWallet || null,
        },
        accounts: {
          signer: signerAccount,
          initiator: initiatorAccount,
          proxy: pAccount,
        },
      };

      return acc;
    }, {});
  });

  sample({
    clock: fillConfirm,
    target: $store,
  });

  sample({
    clock: addConfirms,
    source: $store,
    fn: (store, input) => [...store, input],
    target: $store,
  });

  sample({
    clock: replaceWithConfirm,
    fn: (input) => [input],
    target: $store,
  });

  sample({
    clock: resetConfirm,
    target: $store.reinit,
  });

  return {
    $confirmMap,
    fillConfirm,
    addConfirms,
    replaceWithConfirm,
    resetConfirm,
  };
};
