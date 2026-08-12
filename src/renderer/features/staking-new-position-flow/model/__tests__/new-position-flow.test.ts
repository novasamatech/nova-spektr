import { BN } from '@polkadot/util';
import { type EventCallable, type Store, allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type Asset, type Chain, type ChainId, type Wallet, CryptoType, SigningType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Step } from '../../types';

/**
 * The node is out of scope here.
 *
 * `createComplexTxStore` and `createTxValidationStore` both cost a round trip
 * to a real api and have nothing to say about the decisions this model makes —
 * which step follows which, whose validator selection counts as its own, what
 * call gets built. They are replaced with the smallest stand-ins that keep the
 * graph honest: the tx store passes the core transaction straight through, so
 * assertions are made against the call this model actually built.
 */
vi.mock('@/shared/transactions', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { createStore, sample } = await import('effector');

  return {
    ...actual,
    createComplexTxStore: ({ transaction, initiator }: { transaction: Store<unknown>; initiator: Store<unknown> }) => {
      const $tx = createStore<unknown>(null);
      sample({ clock: transaction, target: $tx });

      return {
        // The self-route a plain account gets from the real store — keeps the
        // route-signer guard honest without the BFS over the account graph.
        $route: initiator.map((account) => (account ? [account] : [])),
        $tx,
        $feeTx: createStore<unknown>(null),
        $pendingWrapping: createStore(false),
        $fee: createStore<unknown>(null),
        $pendingFee: createStore(false),
      };
    },
    // The real one asks the DI permission registry, which is empty in a unit
    // fork — every account would read as unsignable. The permission check has
    // its own tests; here the terminal hop simply signs.
    createRouteSignerStore: ($route: Store<unknown[]>) => $route.map((route) => route.at(-1) ?? null),
    createTxValidationStore: () => ({
      $errors: createStore<unknown[]>([]),
      $balanceValidationResults: createStore<unknown[]>([]),
      $pending: createStore(false),
      $validationDone: createStore(true),
      $valid: createStore(true),
      $failed: createStore(false),
      $available: createStore<unknown[]>([]),
    }),
  };
});

const { mocks } = vi.hoisted(() => ({ mocks: { minBond: null as unknown, chains: null as unknown } }));

vi.mock('@/aggregates/staking-positions', async () => {
  const { createStore } = await import('effector');
  const $minNominatorBond = createStore<Record<string, string>>({});
  const $stakingChains = createStore<unknown[]>([]);
  mocks.minBond = $minNominatorBond;
  mocks.chains = $stakingChains;

  return { stakingPositions: { $minNominatorBond, $stakingChains } };
});

/** A balance the flow can actually bond against — `free - ed` is reservable. */
vi.mock('@/entities/balance', async (importOriginal) => {
  const actual = await importOriginal<{
    balanceModel: Record<string, unknown>;
    balanceUtils: Record<string, unknown>;
  }>();

  // Only the lookup is replaced — the rest of `balanceModel` stays, because
  // other modules in the import graph sample into its events.
  return {
    ...actual,
    balanceUtils: {
      ...actual.balanceUtils,
      getBalance: () => ({
        free: new BN('100000000000000'),
        ed: new BN('10000000000'),
        transferableMode: 'holdAndFreezes',
      }),
    },
  };
});

vi.mock('@/entities/transaction', async (importOriginal) => {
  const actual = await importOriginal<{ transactionService: Record<string, unknown> }>();

  return {
    ...actual,
    transactionService: {
      ...actual.transactionService,
      getCallDataHex: (tx: unknown) => (tx ? '0xdeadbeef' : null),
    },
  };
});

/**
 * The picker is a singleton shared with the Staking page. Standing it in keeps
 * its heavy UI out of the run while leaving the three units this model
 * coordinates through — which is the whole point of these tests.
 */
vi.mock('@/features/validator-selection', async () => {
  const { createEvent } = await import('effector');

  return {
    getSigningMode: () => 'local',
    validatorSelectionModel: {
      events: { formInitiated: createEvent<unknown>(), formCleared: createEvent() },
      output: { formSubmitted: createEvent<unknown[]>() },
    },
  };
});

const { newPositionFlowModel } = await import('../new-position-flow');
const { validatorSelectionModel } = await import('@/features/validator-selection');

/**
 * The real module types `formSubmitted` as a derived `Event`, which
 * `allSettled` cannot drive. At runtime it is the callable stand-in above, so
 * the cast describes what the test actually holds.
 */
const picker = validatorSelectionModel as unknown as {
  events: { formInitiated: EventCallable<unknown>; formCleared: EventCallable<void> };
  output: { formSubmitted: EventCallable<unknown[]> };
};

// --- fixtures ----------------------------------------------------------------

const accountId = (index: number): AccountId => toAccountId(`0x${index.toString(16).padStart(64, '0')}`);

const ALICE = accountId(1);
const CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;

const PLANCK = '10000000000';
const dot = (whole: number) => (BigInt(whole) * BigInt(PLANCK)).toString();

// `staking: 'relaychain'` is what makes `getRelaychainAsset` return it — without
// it the flow has no asset and every amount reads as zero.
const ASSET = {
  assetId: 0,
  symbol: 'DOT',
  precision: 10,
  name: 'Polkadot',
  staking: 'relaychain',
} as unknown as Asset;

const CHAIN = {
  chainId: CHAIN_ID,
  name: 'Polkadot',
  assets: [ASSET],
  addressPrefix: 0,
  nodes: [],
  icon: '',
  options: [],
} as unknown as Chain;

const ACCOUNT = {
  id: 'account-1',
  type: 'universal',
  name: 'Alice',
  walletId: 1,
  accountId: ALICE,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
} as unknown as Wallet['accounts'][number];

const validator = (index: number) => ({ accountId: accountId(index), address: `address-${index}` });

const $chains = () => mocks.chains as Store<unknown[]>;
const $minBond = () => mocks.minBond as Store<Record<string, string>>;

/** The two things the flow reads about a network. */
const seeded = (minBondPlanck = dot(1)) =>
  new Map().set($chains(), [CHAIN]).set($minBond(), { [CHAIN_ID]: minBondPlanck });

/** Walks the form far enough that `Continue` is allowed. */
async function fillForm(scope: ReturnType<typeof fork>, amount = '100') {
  await allSettled(newPositionFlowModel.newPositionRequested, { scope });
  await allSettled(newPositionFlowModel.initiatorChanged, { scope, params: ACCOUNT });
  await allSettled(newPositionFlowModel.amountChanged, { scope, params: amount });
}

// --- tests -------------------------------------------------------------------

describe('staking-new-position-flow · entry', () => {
  it('opens on the form step', async () => {
    const scope = fork({ values: seeded() });
    await allSettled(newPositionFlowModel.newPositionRequested, { scope });

    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.INIT);
    expect(scope.getState(newPositionFlowModel.$chain)).toEqual(CHAIN);
  });

  it('closing clears the amount, the validators and the step', async () => {
    const scope = fork({ values: seeded() });
    await fillForm(scope);
    await allSettled(newPositionFlowModel.flowClosed, { scope });

    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.NONE);
    expect(scope.getState(newPositionFlowModel.$amount)).toBe('');
    expect(scope.getState(newPositionFlowModel.$validators)).toEqual([]);
  });
});

describe('staking-new-position-flow · continue', () => {
  it('walks to the validators step and opens the picker on this flow’s chain', async () => {
    const scope = fork({ values: seeded() });
    const initiated: unknown[] = [];
    createWatch({ unit: picker.events.formInitiated, scope, fn: (p) => initiated.push(p) });

    await fillForm(scope);
    await allSettled(newPositionFlowModel.continueRequested, { scope });

    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.VALIDATORS);
    expect(initiated).toHaveLength(1);
    expect(initiated[0]).toMatchObject({ chain: CHAIN, asset: ASSET, initiator: ACCOUNT });
  });

  it('refuses a bond below the chain minimum', async () => {
    // `staking.nominate` rejects the stash and the batch fails as a whole, so
    // this blocks rather than warns.
    const scope = fork({ values: seeded(dot(10)) });
    await fillForm(scope, '9');

    expect(scope.getState(newPositionFlowModel.$isBelowMinimumBond)).toBe(true);
    expect(scope.getState(newPositionFlowModel.$canContinue)).toBe(false);

    await allSettled(newPositionFlowModel.continueRequested, { scope });

    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.INIT);
  });

  it('accepts exactly the minimum', async () => {
    const scope = fork({ values: seeded(dot(10)) });
    await fillForm(scope, '10');

    expect(scope.getState(newPositionFlowModel.$isBelowMinimumBond)).toBe(false);
    expect(scope.getState(newPositionFlowModel.$canContinue)).toBe(true);
  });

  it('refuses to continue without an account', async () => {
    const scope = fork({ values: seeded() });
    await allSettled(newPositionFlowModel.newPositionRequested, { scope });
    await allSettled(newPositionFlowModel.amountChanged, { scope, params: '100' });

    expect(scope.getState(newPositionFlowModel.$canContinue)).toBe(false);
  });
});

describe('staking-new-position-flow · the shared picker', () => {
  it('takes a selection made while standing at the validators step', async () => {
    const scope = fork({ values: seeded() });
    await fillForm(scope);
    await allSettled(newPositionFlowModel.continueRequested, { scope });

    await allSettled(picker.output.formSubmitted, { scope, params: [validator(7)] });

    expect(scope.getState(newPositionFlowModel.$validators)).toEqual([validator(7)]);
    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.CONFIRM);
  });

  it('ignores a selection submitted by somebody else', async () => {
    // The Staking page's own flows submit through the very same event; a flow
    // parked on the form must not adopt their validator set.
    const scope = fork({ values: seeded() });
    await fillForm(scope);

    await allSettled(picker.output.formSubmitted, { scope, params: [validator(9)] });

    expect(scope.getState(newPositionFlowModel.$validators)).toEqual([]);
    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.INIT);
  });

  it('clears the picker when the step is left, never when it is submitted', async () => {
    const scope = fork({ values: seeded() });
    let cleared = 0;
    createWatch({ unit: picker.events.formCleared, scope, fn: () => (cleared += 1) });

    await fillForm(scope);
    await allSettled(newPositionFlowModel.continueRequested, { scope });
    await allSettled(picker.output.formSubmitted, { scope, params: [validator(7)] });

    // Back from the confirm has to find the selection still there.
    expect(cleared).toBe(0);

    await allSettled(newPositionFlowModel.validatorsCancelled, { scope });

    expect(cleared).toBe(1);
    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.INIT);
  });
});

describe('staking-new-position-flow · the call', () => {
  it('builds bond + nominate from the account being staked from', async () => {
    const scope = fork({ values: seeded() });
    await fillForm(scope);
    await allSettled(newPositionFlowModel.continueRequested, { scope });
    await allSettled(picker.output.formSubmitted, { scope, params: [validator(7), validator(8)] });

    const tx = scope.getState(newPositionFlowModel.$coreTx);

    // The origin is the stash, never the signer — a multisig wraps this call,
    // it does not replace its origin.
    expect(tx).toMatchObject({ chainId: CHAIN_ID, accountId: ALICE });
    expect(tx?.args.transactions).toHaveLength(2);
  });

  it('has no call to build until the validators are known', async () => {
    const scope = fork({ values: seeded() });
    await fillForm(scope);

    expect(scope.getState(newPositionFlowModel.$coreTx)).toBeNull();
  });
});
