import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createEvent, restore, sample } from 'effector';

import {
  type Chain,
  type ChainId,
  type ID,
  type MultisigTransaction,
  type Transaction,
  type Wallet,
} from '@/shared/core';
import { type AnyAccount } from '@/domains/network';
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
  multisigTx: Transaction | null;
};

export type ConfirmItem<Input extends TxConfirmInfo = TxConfirmInfo> = {
  meta: Input;
  wallets: {
    initiator: Wallet;
    signatory: Wallet | null;
  };
};

type Params = {
  $wallets: Store<Wallet[]>;
  $apis: Store<Record<ChainId, ApiPromise> | null>;
  $multisigTransactions: Store<MultisigTransaction[]>;
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

  const $confirmMap = combine($store, $wallets, (store, wallets) => {
    if (!wallets.length) return {};

    return store.reduce<ConfirmMap>((acc, meta, index) => {
      const initiatorWallet = walletUtils.getWalletById(wallets, meta.initiator.walletId);
      if (!initiatorWallet) return acc;

      const signatoryWallet = walletUtils.getWalletById(wallets, meta.signatory.walletId);

      acc[meta.id ?? index] = {
        meta,
        wallets: {
          signatory: signatoryWallet || null,
          initiator: initiatorWallet,
        },
      };

      return acc;
    }, {});
  });

  const $confirms = $confirmMap.map((confirmMap) => Object.values(confirmMap));

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
