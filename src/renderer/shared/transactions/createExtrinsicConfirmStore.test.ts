import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { allSettled, createStore, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { type Wallet } from '@/shared/core';
import { createAccountId, createPolkadotWallet, createVaultBaseAccount, polkadotChain } from '@/shared/mocks';
import { type AnyAccount, type AnyTransaction } from '@/domains/network';

import { type ExtrinsicConfirmInfo, createExtrinsicConfirmStore } from './createExtrinsicConfirmStore';

// Use the real factories from `@/shared/mocks` — do not hand-roll these shapes.
const wallet = createPolkadotWallet(1, { rootAccountId: createAccountId('root') });

const makeAccount = (walletId: number, seed: string): AnyAccount =>
  createVaultBaseAccount(seed, { walletId, accountId: createAccountId(seed) });

const makeInput = (initiatorWalletId: number, signatoryWalletId = 1): ExtrinsicConfirmInfo => ({
  api: {} as ApiPromise,
  chain: polkadotChain,
  initiator: makeAccount(initiatorWalletId, 'initiator'),
  signatory: makeAccount(signatoryWalletId, 'signatory'),
  route: [],
  transaction: { type: 'encoded', callData: '0x00' } as AnyTransaction,
  fee: new BN(1),
});

describe('createExtrinsicConfirmStore', () => {
  it('reports why a confirm item was dropped', async () => {
    const store = createExtrinsicConfirmStore({ wallets: createStore<Wallet[]>([wallet]) });

    const scope = fork();
    await allSettled(store.init, { scope, params: [makeInput(-2)] });

    expect(scope.getState(store.$confirms)).toHaveLength(0);
    expect(scope.getState(store.$dropped)).toContain('-2');
  });

  it('reports why a confirm item was dropped when only the signatory wallet is missing', async () => {
    const store = createExtrinsicConfirmStore({ wallets: createStore<Wallet[]>([wallet]) });

    const scope = fork();
    await allSettled(store.init, { scope, params: [makeInput(1, -3)] });

    expect(scope.getState(store.$confirms)).toHaveLength(0);
    expect(scope.getState(store.$dropped)).toContain('-3');
  });

  it('reports nothing while the wallet list is still empty', async () => {
    const store = createExtrinsicConfirmStore({ wallets: createStore<Wallet[]>([]) });

    const scope = fork();
    await allSettled(store.init, { scope, params: [makeInput(1)] });

    expect(scope.getState(store.$dropped)).toBeNull();
  });

  it('reports nothing when every wallet resolves', async () => {
    const store = createExtrinsicConfirmStore({ wallets: createStore<Wallet[]>([wallet]) });

    const scope = fork();
    await allSettled(store.init, { scope, params: [makeInput(1)] });

    expect(scope.getState(store.$confirms)).toHaveLength(1);
    expect(scope.getState(store.$dropped)).toBeNull();
  });
});
