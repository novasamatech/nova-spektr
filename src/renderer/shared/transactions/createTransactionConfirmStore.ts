import { type ApiPromise } from '@polkadot/api';
import { type Store, type Unit, combine, createEvent, restore, sample } from 'effector';

import { type Chain, type ChainId, type HexString, type ID, type Transaction, type Wallet } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
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

/**
 * The transaction a flow currently holds, with whatever else of the confirm
 * item is derived together with it (route, signing path). `null` transactions
 * mean the flow has nothing to sign right now.
 */
type FlowTransaction<Input extends TxConfirmInfo> = Partial<Omit<Input, 'tx' | 'coreTx'>> & {
  tx: Transaction | null;
  coreTx: Transaction | null;
};

type FollowParams<Input extends TxConfirmInfo> = {
  /**
   * What makes the flow's transaction change — the source store the flow keeps
   * its transaction in.
   */
  clock: Unit<unknown>;
  /**
   * Whether the confirm step is the one on screen.
   */
  $active: Store<boolean>;
  $transaction: Store<FlowTransaction<Input>>;
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

  // Checked over everything the step holds, not only the items whose wallets
  // resolved for display: what can be handed to signing is what gets checked.
  const $isMultisigExists = combine(
    {
      apis: $apis,
      store: $store,
      transactions: $multisigTransactions,
    },
    ({ apis, store, transactions }) => {
      if (!apis || !transactions) return false;

      return store.some((meta) => {
        const api = apis[meta.chain.chainId];
        if (!api) return false;

        return isMultisigOperationPending(meta, api, transactions);
      });
    },
  );

  /**
   * Keeps an open confirm step on the flow's current transaction, for flows
   * that confirm a single transaction built asynchronously: a transaction that
   * settles (or is rebuilt for another route) after the step opened replaces
   * the one the step holds, so the step shows, checks for duplicates and hands
   * to signing what the flow would sign now — never an earlier build. Outside
   * the confirm step the held item is left alone.
   */
  const follow = ({ clock, $active, $transaction }: FollowParams<Input>) => {
    sample({
      clock,
      source: { active: $active, store: $store, transaction: $transaction },
      filter: ({ active, store, transaction }) => {
        return active && store.length === 1 && nonNullable(transaction.tx) && nonNullable(transaction.coreTx);
      },
      fn: ({ store, transaction: { tx, coreTx, ...rest } }) => {
        if (nullable(tx) || nullable(coreTx)) return store;

        return store.map((item) => ({ ...item, ...rest, tx, coreTx }));
      },
      target: $store,
    });
  };

  /**
   * The confirm step's only way out to signing. Fires on `startSigning` with
   * what the step holds at that moment — the very objects it displays and
   * checks against pending multisig operations — so a flow signs the `tx` the
   * user confirmed instead of rebuilding the transaction on its own. Stays
   * silent while an item duplicates a pending multisig operation, or while
   * there is nothing confirmed to sign.
   */
  const confirmed = sample({
    clock: startSigning,
    source: { store: $store, isMultisigExists: $isMultisigExists },
    filter: ({ store, isMultisigExists }) => store.length > 0 && !isMultisigExists,
    fn: ({ store }) => store,
  });

  /**
   * The items last handed to signing. Whatever follows the signature (submit
   * payload, redirect to the created operation) reads the transaction from
   * here, so it describes what was signed even if the confirm step is filled
   * again in the meantime.
   */
  const $confirmed = restore(confirmed, []).reset(resetConfirm);

  return {
    $confirmMap,
    $confirms,
    $confirmed,
    $isMultisigExists,

    init,
    addConfirms,
    replaceWithConfirm,
    resetConfirm,
    startSigning,
    confirmed,
    follow,
  };
};

/**
 * One signing payload per confirmed item: what is signed is its `tx`, by its
 * `signatory` — the transaction and signer the confirm step shows.
 */
export const getSigningPayloads = (confirms: TxConfirmInfo[]) => {
  return confirms.map((confirm) => ({
    chain: confirm.chain,
    account: confirm.initiator,
    signatory: confirm.signatory,
    transaction: confirm.tx,
  }));
};

/**
 * Whether the confirmed transaction would duplicate a multisig operation that
 * is still pending on the same chain. Answers only what it knows: a call whose
 * hash cannot be computed is not reported as a duplicate — the sign step
 * refuses it with the `call-hash-unavailable` block reason instead, so the user
 * sees why signing stopped rather than a non-existent duplicate.
 */
function isMultisigOperationPending(meta: TxConfirmInfo, api: ApiPromise, operations: MultisigOperation[]): boolean {
  const callHash = getMultisigCallHash(meta, api);
  if (!callHash) return false;

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
  // signing time — fall back to the core call, but only when the route actually
  // goes through a multisig: a single-signer call that happens to equal a
  // pending multisig operation's call is not that operation.
  if (!meta.route.some(accountUtils.isAnyMultisigAccount)) return null;

  try {
    return getExtrinsic[meta.coreTx.type](meta.coreTx.args, api).method.hash.toHex();
  } catch (error) {
    console.error(`Failed to encode ${meta.coreTx.type} call`, error);

    return null;
  }
}
