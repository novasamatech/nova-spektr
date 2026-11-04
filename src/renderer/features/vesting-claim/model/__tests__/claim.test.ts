import { BN } from '@polkadot/util';
import { allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { toAccountId } from '@/shared/lib/utils';
import { type TransactionStoresMock, createVaultBaseAccount, polkadotChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Step } from '../../types';
import { type ClaimRequest } from '../claim';

// The node is out of scope here: see `mockTransactionStores`.
const { txStores } = vi.hoisted(() => ({ txStores: { current: null as TransactionStoresMock | null } }));

vi.mock('@/shared/transactions', async (importOriginal) => {
  const { mockTransactionStores } = await import('@/shared/mocks');
  txStores.current = mockTransactionStores(await importOriginal());

  return txStores.current.module;
});

const { claimModel } = await import('../claim');
const { confirmModel } = await import('../confirm');
const { signModel } = await import('@/features/operations/OperationSign');

// --- fixtures ----------------------------------------------------------------

const ALICE: AccountId = toAccountId(`0x${'1'.padStart(64, '0')}`);

const ACCOUNT = createVaultBaseAccount('alice', { walletId: 1, accountId: ALICE, name: 'Alice' });

/** Alice claims what has vested on her own account. */
const request = (): ClaimRequest => ({
  chain: polkadotChain,
  initiator: ACCOUNT,
  claimable: new BN(1),
  stillLocked: new BN(1),
});

/** The validator's verdict on the wrapped claim. */
const $valid = () => txStores.current!.$valid;

// --- tests -------------------------------------------------------------------

describe('vesting-claim · sign gate', () => {
  it('moves to the sign step while the confirm is ready', async () => {
    const scope = fork();

    await allSettled(claimModel.claimStarted, { scope, params: request() });

    expect(scope.getState(claimModel.$step)).toBe(Step.CONFIRM);
    expect(scope.getState(claimModel.$canSign)).toBe(true);

    await allSettled(confirmModel.startSigning, { scope });

    expect(scope.getState(claimModel.$step)).toBe(Step.SIGN);
  });

  it('refuses to sign past a closed gate, even from the confirm', async () => {
    // The validator rejected the claim: the button is disabled, and a stale
    // click must not walk on either.
    const scope = fork({ values: new Map().set($valid(), false) });
    const signSpy = vi.fn();

    await allSettled(claimModel.claimStarted, { scope, params: request() });

    expect(scope.getState(claimModel.$step)).toBe(Step.CONFIRM);
    expect(scope.getState(claimModel.$canSign)).toBe(false);

    const unsubscribe = createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });
    try {
      await allSettled(confirmModel.startSigning, { scope });

      expect(scope.getState(claimModel.$step)).toBe(Step.CONFIRM);
      expect(signSpy).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });
});
