import { BN } from '@polkadot/util';
import { allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { toAccountId } from '@/shared/lib/utils';
import { type TransactionStoresMock, createVaultBaseAccount, polkadotChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type UnlockRequest, Step } from '../../types';

// The node is out of scope here: see `mockTransactionStores`.
const { txStores } = vi.hoisted(() => ({ txStores: { current: null as TransactionStoresMock | null } }));

vi.mock('@/shared/transactions', async (importOriginal) => {
  const { mockTransactionStores } = await import('@/shared/mocks');
  txStores.current = mockTransactionStores(await importOriginal());

  return txStores.current.module;
});

const { unlockFlowModel } = await import('../unlock-flow');
const { confirmModel } = await import('../confirm');
const { signModel } = await import('@/features/operations/OperationSign');

// --- fixtures ----------------------------------------------------------------

const ALICE: AccountId = toAccountId(`0x${'1'.padStart(64, '0')}`);

const ACCOUNT = createVaultBaseAccount('alice', { walletId: 1, accountId: ALICE, name: 'Alice' });

/** Alice releases her own expired lock on one track. */
const request = (): UnlockRequest => ({
  chain: polkadotChain,
  initiator: ACCOUNT,
  target: ALICE,
  actions: [{ type: 'unlock', trackId: '0' }],
  amount: new BN(1),
});

/** The validator's verdict on the wrapped release. */
const $valid = () => txStores.current!.$valid;

// --- tests -------------------------------------------------------------------

describe('governance-unlock-flow · sign gate', () => {
  it('moves to the sign step while the confirm is ready', async () => {
    const scope = fork();

    await allSettled(unlockFlowModel.unlockRequested, { scope, params: request() });

    expect(scope.getState(unlockFlowModel.$step)).toBe(Step.CONFIRM);
    expect(scope.getState(unlockFlowModel.$canSign)).toBe(true);

    await allSettled(confirmModel.startSigning, { scope });

    expect(scope.getState(unlockFlowModel.$step)).toBe(Step.SIGN);
  });

  it('refuses to sign past a closed gate, even from the confirm', async () => {
    // The validator rejected the release: the button is disabled, and a stale
    // click must not walk on either.
    const scope = fork({ values: new Map().set($valid(), false) });
    const signSpy = vi.fn();

    await allSettled(unlockFlowModel.unlockRequested, { scope, params: request() });

    expect(scope.getState(unlockFlowModel.$step)).toBe(Step.CONFIRM);
    expect(scope.getState(unlockFlowModel.$canSign)).toBe(false);

    const unsubscribe = createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });
    try {
      await allSettled(confirmModel.startSigning, { scope });

      expect(scope.getState(unlockFlowModel.$step)).toBe(Step.CONFIRM);
      expect(signSpy).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });
});
