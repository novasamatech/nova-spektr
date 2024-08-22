import { type Store, combine, createEvent, createStore, sample } from 'effector';

import { type Account, type Chain, type ID, type ProxyAccount, TransactionType, type Wallet } from '@shared/core';
import { toAddress } from '@shared/lib/utils';
import { type WrappedTransactions } from '@entities/transaction';
import { walletUtils } from '@entities/wallet';

export type ConfirmInfo = {
  id?: number;
  account: Account;
  signatory?: Account;
  proxiedAccount?: ProxyAccount;
  description: string;
  chain: Chain;
  wrappedTransactions: WrappedTransactions;
};

export type ConfirmItem<Input extends ConfirmInfo = ConfirmInfo> = {
  meta: Input;
  wallets: {
    initiator?: Wallet;
    proxied?: Wallet;
    signer?: Wallet;
  };
};

type Params = {
  $wallets: Store<Wallet[]>;
};

export const createTransactionConfirmStore = <Input extends ConfirmInfo>({ $wallets }: Params) => {
  type ConfirmMap = Record<ID, ConfirmItem<Input>>;

  const fillConfirm = createEvent<Input[]>();
  const addConfirms = createEvent<Input>();
  const replaceConfirm = createEvent<Input>();
  const resetConfirm = createEvent();

  const $store = createStore<Input[]>([]);

  const $confirmMap = combine($store, $wallets, (store, wallets) => {
    if (!wallets.length) return {};

    return store.reduce<ConfirmMap>((acc, meta, index) => {
      const { wrappedTransactions, chain } = meta;
      const { wrappedTx, coreTx } = wrappedTransactions;
      const { addressPrefix } = chain;

      const initiatorWallet = walletUtils.getWalletFilteredAccounts(wallets, {
        walletFn: (wallet) => !walletUtils.isProxied(wallet),
        accountFn: (account) => coreTx.address === toAddress(account.accountId, { prefix: addressPrefix }),
      });

      if (!initiatorWallet) {
        return acc;
      }

      const signerWallet = walletUtils.getWalletFilteredAccounts(wallets, {
        walletFn: (wallet) => !walletUtils.isProxied(wallet),
        accountFn: (account) => wrappedTx?.address === toAddress(account.accountId, { prefix: addressPrefix }),
      });

      const proxiedWallet = walletUtils.getWalletFilteredAccounts(wallets, {
        accountFn: (account) => {
          return (
            wrappedTx.type === TransactionType.PROXY &&
            wrappedTx.args.transaction.address === toAddress(account.accountId, { prefix: addressPrefix })
          );
        },
      });

      acc[meta.id ?? index] = {
        meta,
        wallets: {
          signer: signerWallet,
          initiator: initiatorWallet,
          proxied: proxiedWallet,
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
    clock: replaceConfirm,
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
    replaceConfirm,
    resetConfirm,
  };
};
