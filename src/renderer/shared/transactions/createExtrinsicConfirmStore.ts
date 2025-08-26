import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { type Store, combine, createEvent, restore, sample } from 'effector';

import { type Chain, type Wallet } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AnyAccount, type AnyTransaction } from '@/domains/network';
import { walletUtils } from '@/entities/wallet';

export type ExtrinsicConfirmInfo = {
  api: ApiPromise;
  initiator: AnyAccount;
  signatory: AnyAccount;
  route: AnyAccount[];
  chain: Chain;
  transaction: AnyTransaction;
  fee: BN;
};

type ConfirmItem<Input extends ExtrinsicConfirmInfo = ExtrinsicConfirmInfo> = Input & {
  initiatorWallet: Wallet;
  signatoryWallet: Wallet;
};

type Params = {
  wallets: Store<Wallet[]>;
  // $apis: Store<Record<ChainId, ApiPromise> | null>;
  // TODO restore feature. it depends on transaction traverse feature, that is not implemented yet.
  // $multisigTransactions: Store<MultisigOperation[]>;
};

export const createExtrinsicConfirmStore = <Input extends ExtrinsicConfirmInfo>({ wallets }: Params) => {
  const init = createEvent<Input[]>();
  const startSigning = createEvent();
  const addConfirms = createEvent<Input[]>();
  const replaceWithConfirm = createEvent<Input>();
  const resetConfirm = createEvent();

  const $store = restore<Input[]>(init, []);

  const $confirms = combine($store, wallets, (store, wallets): ConfirmItem<Input>[] => {
    if (!wallets.length) return [];

    return store
      .map((meta) => {
        const initiatorWallet = walletUtils.getWalletById(wallets, meta.initiator.walletId);
        if (!initiatorWallet) return null;

        const signatoryWallet = walletUtils.getWalletById(wallets, meta.signatory.walletId);
        if (!signatoryWallet) return null;

        return {
          ...meta,
          signatoryWallet,
          initiatorWallet,
        };
      })
      .filter(nonNullable);
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

  return {
    $confirms,

    init,
    addConfirms,
    replaceWithConfirm,
    resetConfirm,
    startSigning,
  };
};
