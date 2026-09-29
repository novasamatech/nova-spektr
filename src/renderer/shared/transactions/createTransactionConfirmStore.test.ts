import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { allSettled, createStore, fork } from 'effector';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { type ChainId, type Transaction, type Wallet, AccountType, TransactionType } from '@/shared/core';
import { createAccountId, createPolkadotWallet, createVaultBaseAccount, polkadotChain } from '@/shared/mocks';
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

  it('blocks signing on a multisig route when the call hash cannot be computed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const brokenTx: Transaction = { ...coreTx, type: TransactionType.ASSET_TRANSFER, args: {} };

    const meta = createMeta(brokenTx, [multisig, signatory], brokenTx);

    await expect(getIsMultisigExists(meta, [])).resolves.toBe(true);
  });
});
