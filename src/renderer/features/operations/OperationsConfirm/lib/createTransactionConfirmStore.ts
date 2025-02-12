import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createEvent, createStore, sample } from 'effector';

import {
  type Account,
  type Chain,
  type ChainId,
  type ID,
  type MultisigTransaction,
  type ProxiedAccount,
  type Wallet,
} from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
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
    initiator: Account;
    proxied?: ProxiedAccount | null;
    signer: Account | null;
  };
};

type Params = {
  $wallets: Store<Wallet[]>;
  $apis: Store<Record<ChainId, ApiPromise> | null>;
  $multisigTransactions: Store<MultisigTransaction[]>;
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

    return store.reduce<ConfirmMap>((acc, meta, index) => {
      const { wrappedTransactions, chain, account } = meta;
      const { wrappedTx, coreTx } = wrappedTransactions;
      const { addressPrefix } = chain;

      const isProxyTx = isProxyTransaction(wrappedTx) || isProxyTransaction(coreTx);
      const initiatorAccount = walletUtils.getAccountBy(wallets, (acc) => {
        if (accountUtils.isProxiedAccount(account)) {
          return acc.accountId == account.proxyAccountId;
        }

        const isSameAccount = coreTx.address === toAddress(acc.accountId, { prefix: addressPrefix });

        return isSameAccount;
      });

      if (!initiatorAccount) return acc;

      const initiatorWallet = walletUtils.getWalletById(wallets, initiatorAccount.walletId);
      if (!initiatorWallet) return acc;

      const signerWallet = meta.signatory && walletUtils.getWalletById(wallets, meta.signatory?.walletId);

      const proxiedAccount = isProxyTx && accountUtils.isProxiedAccount(account) ? account : null;
      const proxiedWallet = proxiedAccount && walletUtils.getWalletById(wallets, proxiedAccount.walletId);

      acc[meta.id ?? index] = {
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
