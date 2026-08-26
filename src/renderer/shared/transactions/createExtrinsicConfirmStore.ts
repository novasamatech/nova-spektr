import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { type Store, combine, createEvent, restore, sample } from 'effector';

import { type Chain, type Wallet } from '@/shared/core';
import { type AnyAccount, type AnyTransaction } from '@/domains/network';
import { walletUtils } from '@/entities/wallet';

import { activeOperationRoute } from './activeOperationRoute';

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

  // Publish the route + chain for cross-cutting consumers (see activeOperationRoute).
  sample({
    clock: $store,
    fn: (store) => ({
      route: store.flatMap((item) => item.route),
      chain: store.at(0)?.chain ?? null,
    }),
    target: activeOperationRoute.activeOperationChanged,
  });

  // An empty wallet list is startup state, not a failure — stay silent until it populates.
  const $resolved = combine(
    $store,
    wallets,
    (store, wallets): { confirms: ConfirmItem<Input>[]; dropped: string | null } => {
      if (!wallets.length) return { confirms: [], dropped: null };

      const confirms: ConfirmItem<Input>[] = [];
      let dropped: string | null = null;

      for (const meta of store) {
        const initiatorWallet = walletUtils.getWalletById(wallets, meta.initiator.walletId);
        if (!initiatorWallet) {
          dropped ??= `initiator wallet ${meta.initiator.walletId} not found`;
          continue;
        }

        const signatoryWallet = walletUtils.getWalletById(wallets, meta.signatory.walletId);
        if (!signatoryWallet) {
          dropped ??= `signatory wallet ${meta.signatory.walletId} not found`;
          continue;
        }

        confirms.push({ ...meta, signatoryWallet, initiatorWallet });
      }

      return { confirms, dropped };
    },
  );

  const $confirms = $resolved.map((resolved) => resolved.confirms);
  const $dropped = $resolved.map((resolved) => resolved.dropped);

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
    /** Why the first confirm was dropped (wallet missing), `null` if none. */
    $dropped,

    init,
    addConfirms,
    replaceWithConfirm,
    resetConfirm,
    startSigning,
  };
};
