import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { allSettled, createStore, fork } from 'effector';
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

import { type TxConfirmInfo, createTransactionConfirmStore } from './createTransactionConfirmStore';

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

const coreTx: Transaction = {
  type: TransactionType.TRANSFER,
  chainId: polkadotChain.chainId,
  accountId: FLEXIBLE_ACCOUNT_ID,
  args: { dest: createAccountId('destination'), value: '1000' },
};

describe('createTransactionConfirmStore $isMultisigExists', () => {
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
