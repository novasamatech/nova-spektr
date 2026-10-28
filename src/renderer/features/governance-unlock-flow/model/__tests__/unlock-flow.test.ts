import { BN } from '@polkadot/util';
import { type Store, type StoreWritable, allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type Wallet, CryptoType, SigningType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { polkadotChain } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type UnlockRequest, Step } from '../../types';

/**
 * The node is out of scope here.
 *
 * `createComplexTxStore` and `createTxValidationStore` both cost a round trip
 * to a real api, and neither has anything to say about the decisions this model
 * makes — whether the confirm opens, whether signing is allowed. They are
 * replaced with the smallest stand-ins that keep the graph honest: the tx store
 * passes the core transaction straight through, and the validation verdict is a
 * writable store a test can turn off.
 */
const { validationMock } = vi.hoisted(() => ({ validationMock: { $valid: null as unknown } }));

vi.mock('@/shared/transactions', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { createStore, sample } = await import('effector');

  const $valid = createStore(true);
  validationMock.$valid = $valid;

  return {
    ...actual,
    createComplexTxStore: ({ transaction, initiator }: { transaction: Store<unknown>; initiator: Store<unknown> }) => {
      const $tx = createStore<unknown>(null);
      sample({ clock: transaction, target: $tx });

      return {
        $route: initiator.map((account) => (account ? [account] : [])),
        $tx,
        $feeTx: createStore<unknown>(null),
        $pendingWrapping: createStore(false),
        $fee: createStore<unknown>(null),
        $pendingFee: createStore(false),
      };
    },
    createTxValidationStore: () => ({
      $errors: createStore<unknown[]>([]),
      $balanceValidationResults: createStore<unknown[]>([]),
      $pending: createStore(false),
      $validationDone: createStore(true),
      $valid,
      $failed: createStore(false),
      $available: createStore<unknown[]>([]),
    }),
  };
});

const { unlockFlowModel } = await import('../unlock-flow');
const { confirmModel } = await import('../confirm');
const { signModel } = await import('@/features/operations/OperationSign');

// --- fixtures ----------------------------------------------------------------

const ALICE: AccountId = toAccountId(`0x${'1'.padStart(64, '0')}`);

const ACCOUNT: Wallet['accounts'][number] = {
  id: 'account-1',
  type: 'universal',
  name: 'Alice',
  walletId: 1,
  accountId: ALICE,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

/** Alice releases her own expired lock on one track. */
const request = (): UnlockRequest => ({
  chain: polkadotChain,
  initiator: ACCOUNT,
  target: ALICE,
  actions: [{ type: 'unlock', trackId: '0' }],
  amount: new BN(1),
});

/** The validator's verdict on the wrapped release. */
const $valid = () => validationMock.$valid as StoreWritable<boolean>;

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
