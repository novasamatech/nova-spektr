import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createEvent, createStore, sample } from 'effector';

import { type Chain, type ChainId, type ID, type ProxiedAccount, type Wallet } from '@/shared/core';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';
import { operationsUtils } from '@/entities/operations';
import { type WrappedTransactions, isProxyTransaction } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';

export type ConfirmInfo = {
  id?: number;
  account: AnyAccount;
  signatory: AnyAccount | null;
  chain: Chain;
  wrappedTransactions: WrappedTransactions;
};

export type ConfirmItem<Input extends ConfirmInfo = ConfirmInfo> = {
  meta: Input;
  wallets: {
    initiator: Wallet;
    proxied: Wallet | null;
    signer: Wallet | null;
  };
  accounts: {
    initiator: AnyAccount;
    proxied?: ProxiedAccount | null;
    signer: AnyAccount | null;
  };
};

type Params = {
  $wallets: Store<Wallet[]>;
  $apis: Store<Record<ChainId, ApiPromise> | null>;
  $multisigTransactions: Store<MultisigOperation[]>;
};

export const createTransactionConfirmStore = <Input extends ConfirmInfo>({
  $wallets,
  $apis,
  $multisigTransactions,
}: Params) => {
  type ConfirmMap = Record<ID, ConfirmItem<Input>>;

  const fillConfirm = createEvent<Input[]>();
  const addConfirms = createEvent<Input[]>();
  const replaceWithConfirm = createEvent<Input>();
  const resetConfirm = createEvent();

  const $store = createStore<Input[]>([]);

  const $confirmMap = combine($store, $wallets, (store, wallets) => {
    if (!wallets.length) return {};

    return store.reduce<ConfirmMap>((confirmMap, meta, index) => {
      const { wrappedTransactions, account } = meta;
      const { wrappedTx, coreTx } = wrappedTransactions;

      const isProxyTx = isProxyTransaction(wrappedTx) || isProxyTransaction(coreTx);
      const initiatorAccount = walletUtils.getAccountBy(wallets, (accountItem) => {
        if (accountUtils.isProxiedAccount(account)) {
          return account.connections.some((c) => accountItem.accountId === c.proxyAccountId);
        }

        const isSameAccount = coreTx.accountId === accountItem.accountId;

        return isSameAccount;
      });

      if (!initiatorAccount) return confirmMap;

      const initiatorWallet = walletUtils.getWalletById(wallets, initiatorAccount.walletId);
      if (!initiatorWallet) return confirmMap;

      const signerWallet = meta.signatory && walletUtils.getWalletById(wallets, meta.signatory?.walletId);

      const proxiedAccount = isProxyTx && accountUtils.isProxiedAccount(account) ? account : null;
      const proxiedWallet = proxiedAccount && walletUtils.getWalletById(wallets, proxiedAccount.walletId);

      confirmMap[meta.id ?? index] = {
        meta,
        wallets: {
          signer: signerWallet || null,
          initiator: initiatorWallet,
          proxied: proxiedWallet || null,
        },
        accounts: {
          signer: meta.signatory,
          initiator: initiatorAccount,
          proxied: proxiedAccount,
        },
      };

      return confirmMap;
    }, {});
  });

  sample({
    clock: fillConfirm,
    target: $store,
  });

  sample({
    clock: addConfirms,
    source: $store,
    fn: (store, input) => store.concat(input),
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

  const $isMultisigExists = combine(
    {
      apis: $apis,
      confirmMap: $confirmMap,
      transactions: $multisigTransactions,
    },
    ({ apis, confirmMap, transactions }) => {
      if (!apis || !confirmMap || !transactions) return false;

      for (const confirmData of Object.values(confirmMap)) {
        const { meta } = confirmData;

        if (
          operationsUtils.isMultisigAlreadyExists({
            coreTxs: [meta.wrappedTransactions.coreTx],
            apis,
            transactions,
          })
        ) {
          return true;
        }
      }

      return false;
    },
  );

  return {
    $confirmMap,
    $isMultisigExists,

    fillConfirm,
    addConfirms,
    replaceWithConfirm,
    resetConfirm,
  };
};
