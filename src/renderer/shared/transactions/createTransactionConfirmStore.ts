import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createEvent, restore, sample } from 'effector';

import { type Chain, type ChainId, type HexString, type ID, type Transaction, type Wallet } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import {
  type AnyAccount,
  type MultisigOperation,
  MultisigOperationStatus,
  multisigOperationService,
} from '@/domains/network';
import { getExtrinsic } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';

import { activeOperationRoute } from './activeOperationRoute';

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

  // Publish the route + chain for cross-cutting consumers (see activeOperationRoute).
  sample({
    clock: $store,
    fn: (store) => ({
      route: store.flatMap((item) => item.route),
      chain: store.at(0)?.chain ?? null,
    }),
    target: activeOperationRoute.activeOperationChanged,
  });

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
      if (!apis || !transactions) return false;

      return Object.values(confirmMap).some(({ meta }) => {
        const api = apis[meta.chain.chainId];
        if (!api) return false;

        return isMultisigOperationPending(meta, api, transactions);
      });
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

/**
 * Whether the confirmed transaction would duplicate a multisig operation that
 * is still pending on the same chain.
 */
function isMultisigOperationPending(meta: TxConfirmInfo, api: ApiPromise, operations: MultisigOperation[]): boolean {
  const callHash = getMultisigCallHash(meta, api);

  if (!callHash) {
    // Nothing to compare against: block signing on a multisig route rather than
    // risk creating a duplicate operation.
    return meta.route.some(accountUtils.isAnyMultisigAccount);
  }

  return operations.some(
    (operation) =>
      operation.status === MultisigOperationStatus.Pending &&
      operation.chainId === meta.chain.chainId &&
      operation.callHash === callHash,
  );
}

function getMultisigCallHash(meta: TxConfirmInfo, api: ApiPromise): HexString | null {
  const wrappedCallHash = multisigOperationService.getWrappedMultisigCallHash(meta.tx, api);
  if (wrappedCallHash) return wrappedCallHash;

  // Flows that confirm the unwrapped transaction (e.g. baskets) wrap it only at
  // signing time — fall back to the core call.
  try {
    return getExtrinsic[meta.coreTx.type](meta.coreTx.args, api).method.hash.toHex();
  } catch (error) {
    console.error(`Failed to encode ${meta.coreTx.type} call`, error);

    return null;
  }
}
