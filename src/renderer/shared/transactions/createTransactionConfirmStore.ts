import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createEvent, restore, sample } from 'effector';

import { type Chain, type ChainId, type ID, type Transaction, type Wallet } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';
import { operationsUtils } from '@/entities/operations';
import { walletUtils } from '@/entities/wallet';

export type TxConfirmInfo = {
  id?: number;
  initiator: AnyAccount;
  signatory: AnyAccount;
  route: AnyAccount[];
  chain: Chain;
  tx: Transaction;
  coreTx: Transaction;
};

export type ConfirmItem<Input extends TxConfirmInfo = TxConfirmInfo> = {
  meta: Input;
  wallets: {
    initiator: Wallet;
    signatory: Wallet;
  };
};

type Params = {
  $wallets: Store<Wallet[]>;
  $apis: Store<Record<ChainId, ApiPromise> | null>;
  $multisigTransactions: Store<MultisigOperation[]>;
};

export const createTransactionConfirmStore = <Input extends TxConfirmInfo>({
  $wallets,
  $apis,
  $multisigTransactions,
}: Params) => {
  type ConfirmMap = Record<ID, ConfirmItem<Input>>;

  const init = createEvent<Input[]>();
  const startSigning = createEvent();
  const addConfirms = createEvent<Input[]>();
  const replaceWithConfirm = createEvent<Input>();
  const resetConfirm = createEvent();

  const $store = restore<Input[]>(init, []);

  const $confirms = combine($store, $wallets, (store, wallets): ConfirmItem<Input>[] => {
    if (!wallets.length) return [];

    return store
      .map((meta) => {
        const initiatorWallet = walletUtils.getWalletById(wallets, meta.initiator.walletId);
        if (!initiatorWallet) return null;

        const signatoryWallet = walletUtils.getWalletById(wallets, meta.signatory.walletId);
        if (!signatoryWallet) return null;

        return {
          meta,
          wallets: {
            signatory: signatoryWallet,
            initiator: initiatorWallet,
          },
        };
      })
      .filter(nonNullable);
  });

  const $confirmMap = $confirms.map((confirms) => {
    if (!confirms.length) return {};

    return confirms.reduce<ConfirmMap>((acc, confirm, index) => {
      acc[confirm.meta.id ?? index] = confirm;

      return acc;
    }, {});
  });

  sample({
    clock: addConfirms,
    source: $store,
    fn: (store, input) => store.concat(input),
    target: $store,
  });

  sample({
    clock: replaceWithConfirm,
    source: $store,
    fn: (store, input) => {
      if (nonNullable(input.id)) {
        const existingIndex = store.findIndex((item) => item.id === input.id);
        if (existingIndex >= 0) {
          const newStore = [...store];
          newStore[existingIndex] = input;
          return newStore;
        }
        return store.concat(input);
      }
      return [input];
    },
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
            coreTxs: [meta.coreTx],
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
    $confirms,
    $isMultisigExists,

    init,
    addConfirms,
    replaceWithConfirm,
    resetConfirm,
    startSigning,
  };
};
