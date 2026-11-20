import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { type Store, allSettled, combine, createEvent, createStore, createWatch, fork } from 'effector';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { type ChainId, type Transaction, type Wallet, AccountType, TransactionType } from '@/shared/core';
import {
  createAccountId,
  createPolkadotWallet,
  createVaultBaseAccount,
  createVaultChainAccount,
  polkadotChain,
} from '@/shared/mocks';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';
// eslint-disable-next-line boundaries/entry-point -- test-only runtime metadata fixture, not part of the domain API
import { metadata } from '@/domains/network/transaction/service.mocks';
import { getExtrinsic } from '@/entities/transaction';

import { type TxConfirmInfo, createTransactionConfirmStore, getSigningPayloads } from './createTransactionConfirmStore';

const wallet = createPolkadotWallet(1, { rootAccountId: createAccountId('root') });
const signatory = createVaultBaseAccount('signatory', { walletId: 1, accountId: createAccountId('signatory') });

const FLEXIBLE_ACCOUNT_ID = createAccountId('flexible');
const MULTISIG_ACCOUNT_ID = createAccountId('multisig');

const flexibleMultisig = {
  ...signatory,
  accountId: FLEXIBLE_ACCOUNT_ID,
  accountType: AccountType.FLEX_MULTISIG,
} as unknown as AnyAccount;

const multisig = {
  ...signatory,
  accountId: MULTISIG_ACCOUNT_ID,
  accountType: AccountType.MULTISIG,
} as unknown as AnyAccount;

const combineTransaction = (
  $tx: Store<Transaction | null>,
  $route: Store<AnyAccount[]>,
): Store<{ tx: Transaction | null; coreTx: Transaction | null; route: AnyAccount[] }> => {
  return combine({ tx: $tx, coreTx: $tx, route: $route });
};

const coreTx: Transaction = {
  type: TransactionType.TRANSFER,
  chainId: polkadotChain.chainId,
  accountId: FLEXIBLE_ACCOUNT_ID,
  args: { dest: createAccountId('destination'), value: '1000' },
};

let api: ApiPromise;

beforeAll(async () => {
  const registry = new TypeRegistry();
  const provider = new MockProvider(registry);
  const genesisHash = registry.createType('Hash', await provider.send('chain_getBlockHash', [])).toHex();

  api = await ApiPromise.create({ metadata: { [`${genesisHash}-0`]: metadata }, provider, registry });
});

afterAll(async () => {
  await api.disconnect();
});

const createPendingOperation = (callHash: string, chainId: ChainId = polkadotChain.chainId) =>
  ({ status: 'pending', callHash, chainId }) as unknown as MultisigOperation;

describe('createTransactionConfirmStore $isMultisigExists', () => {
  // Mirrors the flexible multisig wrapper: asMulti carries proxy.proxy(flexible, coreTx).
  const createFlexibleMultisigTx = () => {
    const proxyCall = api.tx.proxy.proxy(FLEXIBLE_ACCOUNT_ID, 'Any', getExtrinsic[coreTx.type](coreTx.args, api));

    const tx: Transaction = {
      type: TransactionType.MULTISIG_AS_MULTI,
      chainId: polkadotChain.chainId,
      accountId: FLEXIBLE_ACCOUNT_ID,
      args: { call: proxyCall.method.toHex(), callHash: proxyCall.method.hash.toHex() },
    };

    return { tx, proxyCallHash: proxyCall.method.hash.toHex() };
  };

  const coreCallHash = () => getExtrinsic[coreTx.type](coreTx.args, api).method.hash.toHex();

  const createMeta = (tx: Transaction, route: AnyAccount[], core: Transaction = coreTx): TxConfirmInfo => ({
    initiator: route[0] ?? signatory,
    signatory,
    route,
    chain: polkadotChain,
    tx,
    coreTx: core,
  });

  const getIsMultisigExists = async (meta: TxConfirmInfo, operations: MultisigOperation[]) => {
    const store = createTransactionConfirmStore({
      $wallets: createStore<Wallet[]>([wallet]),
      $apis: createStore<Record<ChainId, ApiPromise> | null>({ [polkadotChain.chainId]: api }),
      $multisigTransactions: createStore<MultisigOperation[]>(operations),
    });

    const scope = fork();
    await allSettled(store.init, { scope, params: [meta] });

    return scope.getState(store.$isMultisigExists);
  };

  it('detects a pending duplicate of a flexible multisig call', async () => {
    const { tx, proxyCallHash } = createFlexibleMultisigTx();

    const meta = createMeta(tx, [flexibleMultisig, signatory]);

    await expect(getIsMultisigExists(meta, [createPendingOperation(proxyCallHash)])).resolves.toBe(true);
  });

  it('does not match a flexible multisig call against the bare core call hash', async () => {
    const { tx } = createFlexibleMultisigTx();

    const meta = createMeta(tx, [flexibleMultisig, signatory]);

    await expect(getIsMultisigExists(meta, [createPendingOperation(coreCallHash())])).resolves.toBe(false);
  });

  it('ignores pending operations on another chain', async () => {
    const { tx, proxyCallHash } = createFlexibleMultisigTx();

    const meta = createMeta(tx, [flexibleMultisig, signatory]);
    const operation = createPendingOperation(proxyCallHash, '0x01');

    await expect(getIsMultisigExists(meta, [operation])).resolves.toBe(false);
  });

  it('falls back to the core call when the transaction is not wrapped yet', async () => {
    const meta = createMeta(coreTx, [multisig, signatory]);

    await expect(getIsMultisigExists(meta, [createPendingOperation(coreCallHash())])).resolves.toBe(true);
  });

  it('raises no alert for a single-signer call that equals a pending multisig operation', async () => {
    const meta = createMeta(coreTx, [signatory]);

    await expect(getIsMultisigExists(meta, [createPendingOperation(coreCallHash())])).resolves.toBe(false);
  });

  it('detects a pending duplicate of a plain multisig call wrapped in asMulti', async () => {
    const coreCall = getExtrinsic[coreTx.type](coreTx.args, api);
    const tx: Transaction = {
      type: TransactionType.MULTISIG_AS_MULTI,
      chainId: polkadotChain.chainId,
      accountId: MULTISIG_ACCOUNT_ID,
      args: { call: coreCall.method.toHex(), callHash: coreCallHash() },
    };

    const meta = createMeta(tx, [multisig, signatory]);

    await expect(getIsMultisigExists(meta, [createPendingOperation(coreCallHash())])).resolves.toBe(true);
  });

  it('does not report a duplicate on a multisig route when the call hash cannot be computed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const brokenTx: Transaction = { ...coreTx, type: TransactionType.ASSET_TRANSFER, args: {} };

    const meta = createMeta(brokenTx, [multisig, signatory], brokenTx);

    // An unknown hash is not a duplicate: the sign step blocks it with the
    // `call-hash-unavailable` reason instead of the "operation exists" alert.
    await expect(getIsMultisigExists(meta, [createPendingOperation(coreCallHash())])).resolves.toBe(false);
  });

  it('SP-62: raises no alert for unwrapped multishard transactions while other operations are pending', async () => {
    const shards = ['shard-1', 'shard-2', 'shard-3'].map((id, index) =>
      createVaultChainAccount(id, { walletId: 1, derivationPath: `//${index}` }),
    );
    // Every shard signs its own copy of the core call; there is no multisig in the route to wrap it.
    const metas = shards.map((shard) => {
      const shardTx = { ...coreTx, accountId: shard.accountId };

      return { ...createMeta(shardTx, [shard], shardTx), signatory: shard };
    });
    const otherCall = getExtrinsic[coreTx.type]({ ...coreTx.args, value: '2000' }, api);

    const store = createTransactionConfirmStore({
      $wallets: createStore<Wallet[]>([wallet]),
      $apis: createStore<Record<ChainId, ApiPromise> | null>({ [polkadotChain.chainId]: api }),
      $multisigTransactions: createStore<MultisigOperation[]>([
        createPendingOperation(otherCall.method.hash.toHex()),
        createPendingOperation(coreCallHash(), '0x01'),
      ]),
    });

    const scope = fork();
    await allSettled(store.init, { scope, params: metas });

    expect(Object.keys(scope.getState(store.$confirmMap))).toHaveLength(shards.length);
    expect(scope.getState(store.$isMultisigExists)).toBe(false);
  });
});

describe('createTransactionConfirmStore confirmed', () => {
  const coreCallHash = () => getExtrinsic[coreTx.type](coreTx.args, api).method.hash.toHex();

  const createMeta = (tx: Transaction, route: AnyAccount[] = [signatory]): TxConfirmInfo => ({
    initiator: route[0] ?? signatory,
    signatory,
    route,
    chain: polkadotChain,
    tx,
    coreTx,
  });

  const createTx = (value: string): Transaction => ({ ...coreTx, args: { ...coreTx.args, value } });

  const setup = (operations: MultisigOperation[] = []) => {
    const store = createTransactionConfirmStore({
      $wallets: createStore<Wallet[]>([wallet]),
      $apis: createStore<Record<ChainId, ApiPromise> | null>({ [polkadotChain.chainId]: api }),
      $multisigTransactions: createStore<MultisigOperation[]>(operations),
    });
    const scope = fork();
    const onConfirmed = vi.fn();
    createWatch({ unit: store.confirmed, fn: onConfirmed, scope });

    return { store, scope, onConfirmed };
  };

  it('hands the confirmed items to signing', async () => {
    const { store, scope, onConfirmed } = setup();
    const meta = createMeta(createTx('1000'));

    await allSettled(store.init, { scope, params: [meta] });
    await allSettled(store.startSigning, { scope });

    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(onConfirmed.mock.calls[0]![0]).toEqual([meta]);
    expect(onConfirmed.mock.calls[0]![0][0]).toBe(scope.getState(store.$confirms)[0]!.meta);
    expect(scope.getState(store.$confirmed)[0]!.tx).toBe(meta.tx);
  });

  it('carries what the confirm step holds at the moment of the click', async () => {
    const { store, scope, onConfirmed } = setup();
    const first = createMeta(createTx('1000'));
    const second = createMeta(createTx('2000'));

    await allSettled(store.init, { scope, params: [first] });
    await allSettled(store.init, { scope, params: [second] });
    await allSettled(store.startSigning, { scope });

    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(onConfirmed.mock.calls[0]![0][0].tx).toBe(second.tx);
  });

  it('does not start signing while the confirmed call duplicates a pending multisig operation', async () => {
    const { store, scope, onConfirmed } = setup([createPendingOperation(coreCallHash())]);

    await allSettled(store.init, { scope, params: [createMeta(coreTx, [multisig, signatory])] });

    expect(scope.getState(store.$isMultisigExists)).toBe(true);

    await allSettled(store.startSigning, { scope });

    expect(onConfirmed).not.toHaveBeenCalled();
    expect(scope.getState(store.$confirmed)).toEqual([]);
  });

  it('does not start signing when nothing is confirmed', async () => {
    const { store, scope, onConfirmed } = setup();

    await allSettled(store.startSigning, { scope });

    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('keeps the items handed to signing when the confirm step is filled again', async () => {
    const { store, scope } = setup();
    const signed = createMeta(createTx('1000'));

    await allSettled(store.init, { scope, params: [signed] });
    await allSettled(store.startSigning, { scope });
    await allSettled(store.init, { scope, params: [createMeta(createTx('2000'))] });

    expect(scope.getState(store.$confirmed)[0]!.tx).toBe(signed.tx);
  });

  it('builds one signing payload per confirmed item from its own transaction and signer', async () => {
    const { store, scope } = setup();
    const metas = [createMeta(createTx('1000')), createMeta(createTx('2000'))];

    await allSettled(store.init, { scope, params: metas });

    expect(getSigningPayloads(scope.getState(store.$confirms).map((confirm) => confirm.meta))).toEqual(
      metas.map((meta) => ({
        chain: meta.chain,
        account: meta.initiator,
        signatory: meta.signatory,
        transaction: meta.tx,
      })),
    );
  });
});

describe('createTransactionConfirmStore follow', () => {
  const createTx = (value: string): Transaction => ({ ...coreTx, args: { ...coreTx.args, value } });

  const setup = () => {
    const store = createTransactionConfirmStore({
      $wallets: createStore<Wallet[]>([wallet]),
      $apis: createStore<Record<ChainId, ApiPromise> | null>(null),
      $multisigTransactions: createStore<MultisigOperation[]>([]),
    });
    const txChanged = createEvent<Transaction | null>();
    const routeChanged = createEvent<AnyAccount[]>();
    const activeChanged = createEvent<boolean>();
    const $tx = createStore<Transaction | null>(null).on(txChanged, (_, tx) => tx);
    const $route = createStore<AnyAccount[]>([signatory]).on(routeChanged, (_, route) => route);
    const $active = createStore(true).on(activeChanged, (_, active) => active);

    store.follow({
      clock: $tx,
      $active,
      $transaction: combineTransaction($tx, $route),
    });

    const opened = createTx('1000');
    const meta: TxConfirmInfo = {
      initiator: signatory,
      signatory,
      route: [signatory],
      chain: polkadotChain,
      tx: opened,
      coreTx: opened,
    };

    return { store, scope: fork(), txChanged, routeChanged, activeChanged, meta };
  };

  it('replaces the transaction of the open confirm step and signs the replacement', async () => {
    const { store, scope, txChanged, routeChanged, meta } = setup();
    const rebuilt = createTx('2000');
    const onConfirmed = vi.fn();
    createWatch({ unit: store.confirmed, fn: onConfirmed, scope });

    await allSettled(store.init, { scope, params: [meta] });
    await allSettled(routeChanged, { scope, params: [multisig, signatory] });
    await allSettled(txChanged, { scope, params: rebuilt });

    const [confirm] = scope.getState(store.$confirms);

    expect(confirm!.meta.tx).toBe(rebuilt);
    expect(confirm!.meta.route).toEqual([multisig, signatory]);
    expect(confirm!.meta.initiator).toBe(meta.initiator);

    await allSettled(store.startSigning, { scope });

    expect(getSigningPayloads(onConfirmed.mock.calls[0]![0])[0]!.transaction).toBe(rebuilt);
  });

  it('leaves the held transaction alone outside the confirm step', async () => {
    const { store, scope, txChanged, activeChanged, meta } = setup();

    await allSettled(store.init, { scope, params: [meta] });
    await allSettled(activeChanged, { scope, params: false });
    await allSettled(txChanged, { scope, params: createTx('2000') });

    expect(scope.getState(store.$confirms)[0]!.meta.tx).toBe(meta.tx);
  });

  it('keeps the held transaction when the flow has none to offer', async () => {
    const { store, scope, txChanged, meta } = setup();

    await allSettled(store.init, { scope, params: [meta] });
    await allSettled(txChanged, { scope, params: createTx('2000') });
    await allSettled(txChanged, { scope, params: null });

    expect(scope.getState(store.$confirms)[0]!.meta.tx.args.value).toBe('2000');
  });
});

describe('createTransactionConfirmStore without the wallets behind the items', () => {
  const duplicate: Transaction = {
    type: TransactionType.MULTISIG_AS_MULTI,
    chainId: polkadotChain.chainId,
    accountId: MULTISIG_ACCOUNT_ID,
    args: { callHash: `0x${'ab'.repeat(32)}` },
  };

  const setup = (operations: MultisigOperation[]) => {
    const store = createTransactionConfirmStore({
      // No wallet is known for the accounts below — e.g. the initiator's wallet is hidden.
      $wallets: createStore<Wallet[]>([createPolkadotWallet(99, { rootAccountId: createAccountId('other') })]),
      $apis: createStore<Record<ChainId, ApiPromise> | null>({ [polkadotChain.chainId]: api }),
      $multisigTransactions: createStore<MultisigOperation[]>(operations),
    });
    const scope = fork();
    const onConfirmed = vi.fn();
    createWatch({ unit: store.confirmed, fn: onConfirmed, scope });

    return { store, scope, onConfirmed };
  };

  const meta = (tx: Transaction): TxConfirmInfo => ({
    initiator: multisig,
    signatory,
    route: [multisig, signatory],
    chain: polkadotChain,
    tx,
    coreTx,
  });

  it('still hands what it holds to signing', async () => {
    const { store, scope, onConfirmed } = setup([]);

    await allSettled(store.init, { scope, params: [meta(duplicate)] });

    expect(scope.getState(store.$confirms)).toEqual([]);

    await allSettled(store.startSigning, { scope });

    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(onConfirmed.mock.calls[0]![0][0].tx).toBe(duplicate);
  });

  it('still refuses a duplicate of a pending multisig operation', async () => {
    const { store, scope, onConfirmed } = setup([createPendingOperation(duplicate.args.callHash)]);

    await allSettled(store.init, { scope, params: [meta(duplicate)] });

    expect(scope.getState(store.$isMultisigExists)).toBe(true);

    await allSettled(store.startSigning, { scope });

    expect(onConfirmed).not.toHaveBeenCalled();
  });
});
