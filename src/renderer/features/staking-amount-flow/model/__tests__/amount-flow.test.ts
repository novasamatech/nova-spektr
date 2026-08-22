import { type Store, type createStore, allSettled, createWatch, fork } from 'effector';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type Asset,
  type Chain,
  type ChainId,
  type Wallet,
  ConnectionStatus,
  CryptoType,
  SigningType,
  TransactionType,
} from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingPosition } from '@/domains/staking';
import { Step } from '../../types';

/**
 * The node is out of scope here.
 *
 * `createComplexTxStore` and `createTxValidationStore` both cost a round trip
 * to a real api, and neither has anything to say about the decisions this model
 * makes — which call is built, whether the remainder warrants a warning,
 * whether `Continue` is allowed. They are replaced with the smallest stand-ins
 * that keep the graph honest: the tx store passes the core transaction straight
 * through, so every assertion below is made against the call this model
 * actually built.
 */
vi.mock('@/shared/transactions', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { createStore, sample } = await import('effector');

  // Every store is writable: other models in the import graph reset the ones
  // they get back from this factory, and a derived store would refuse.
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

const { $minNominatorBondMock } = vi.hoisted(() => {
  return { $minNominatorBondMock: { current: null as unknown } };
});

vi.mock('@/aggregates/staking-positions', async () => {
  const { createStore } = await import('effector');
  const $minNominatorBond = createStore<Record<string, string>>({});
  $minNominatorBondMock.current = $minNominatorBond;

  return { stakingPositions: { $minNominatorBond } };
});

// Draft saving needs encoded call data, which only a live api can produce. The
// draft branch is about *which* path the flow takes, not about SCALE encoding.
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

const { amountFlowModel } = await import('../amount-flow');
const { networkModel } = await import('@/entities/network');
const { createDraftModel } = await import('@/features/drafts');
const { signModel } = await import('@/features/operations/OperationSign');

// --- fixtures ----------------------------------------------------------------

const accountId = (index: number): AccountId => toAccountId(`0x${index.toString(16).padStart(64, '0')}`);

const ALICE = accountId(1);
const CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;

const PLANCK = '10000000000';
const dot = (whole: number) => (BigInt(whole) * BigInt(PLANCK)).toString();

const ASSET = { assetId: 0, symbol: 'DOT', precision: 10, name: 'Polkadot' } as unknown as Asset;

const CHAIN = {
  chainId: CHAIN_ID,
  name: 'Polkadot',
  assets: [ASSET],
  addressPrefix: 0,
  nodes: [],
  icon: '',
  options: [],
} as unknown as Chain;

type AccountFixture = Wallet['accounts'][number];

const ACCOUNT: AccountFixture = {
  id: 'account-1',
  type: 'universal',
  name: 'Alice',
  walletId: 1,
  accountId: ALICE,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

const position = (active: string, unbondingChunks = 0): StakingPosition => ({
  accountId: ALICE,
  chainId: CHAIN_ID,
  stake: { accountId: ALICE, chainId: CHAIN_ID, controller: ALICE, stash: ALICE, active, total: active, unlocking: [] },
  status: 'active',
  statusReason: null,
  kind: 'nominator',
  validator: null,
  nominations: [],
  activeValidators: [],
  unbonding: Array.from({ length: unbondingChunks }, (_, index) => ({
    value: dot(1),
    era: 100 + index,
    erasLeft: 1,
    unlockEstimateMs: null,
    redeemable: false,
  })),
  redeemable: '0',
  totalUnbonding: '0',
  payee: null,
  payeeLoaded: false,
});

const target = (active = dot(1000), unbondingChunks = 0) => ({
  position: position(active, unbondingChunks),
  chain: CHAIN,
  asset: ASSET,
  account: ACCOUNT,
  wallet: null,
  signingMode: 'local' as const,
});

const $minNominatorBond = () => $minNominatorBondMock.current as ReturnType<typeof createStore<Record<string, string>>>;

/** `$coreTx` is gated on the chain being connected — most tests want it open. */
const connected = () => new Map().set(networkModel.$connectionStatuses, { [CHAIN_ID]: ConnectionStatus.CONNECTED });

const withMinBond = (planck: string) => connected().set($minNominatorBond(), { [CHAIN_ID]: planck });

// --- tests -------------------------------------------------------------------

describe('staking-amount-flow · entry', () => {
  it('unbondRequested opens the amount step in unbond mode', async () => {
    const scope = fork();
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });

    expect(scope.getState(amountFlowModel.$step)).toBe(Step.INIT);
    expect(scope.getState(amountFlowModel.$mode)).toBe('unbond');
    expect(scope.getState(amountFlowModel.$activeStake).toString()).toBe(dot(1000));
  });

  it('addStakeRequested opens the same step in add-stake mode', async () => {
    const scope = fork();
    await allSettled(amountFlowModel.addStakeRequested, { scope, params: target() });

    expect(scope.getState(amountFlowModel.$step)).toBe(Step.INIT);
    expect(scope.getState(amountFlowModel.$mode)).toBe('addStake');
  });

  it('closing the flow clears the request and the amount', async () => {
    const scope = fork();
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '100' });
    await allSettled(amountFlowModel.flowClosed, { scope });

    expect(scope.getState(amountFlowModel.$step)).toBe(Step.NONE);
    expect(scope.getState(amountFlowModel.$request)).toBeNull();
    expect(scope.getState(amountFlowModel.$amount)).toBe('');
  });
});

describe('staking-amount-flow · continue', () => {
  it('reaches CONFIRM once an amount is entered', async () => {
    const scope = fork({ values: connected() });
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '100' });
    await allSettled(amountFlowModel.continueRequested, { scope });

    expect(scope.getState(amountFlowModel.$step)).toBe(Step.CONFIRM);
  });

  it('stays on the amount step while the amount is empty', async () => {
    const scope = fork();
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.continueRequested, { scope });

    expect(scope.getState(amountFlowModel.$step)).toBe(Step.INIT);
  });

  it('refuses an amount larger than the stake', async () => {
    const scope = fork({ values: connected() });
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '2000' });
    await allSettled(amountFlowModel.continueRequested, { scope });

    expect(scope.getState(amountFlowModel.$canContinue)).toBe(false);
    expect(scope.getState(amountFlowModel.$step)).toBe(Step.INIT);
  });

  it('the below-minimum warning does NOT block Continue — it is legal, merely suboptimal', async () => {
    const scope = fork({ values: withMinBond(dot(250)) });
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    // 1000 − 900 = 100, well under the 250 minimum.
    await allSettled(amountFlowModel.amountChanged, { scope, params: '900' });

    expect(scope.getState(amountFlowModel.$isBelowMinimumBond)).toBe(true);
    expect(scope.getState(amountFlowModel.$canContinue)).toBe(true);

    await allSettled(amountFlowModel.continueRequested, { scope });
    expect(scope.getState(amountFlowModel.$step)).toBe(Step.CONFIRM);
  });

  it('Max fills in the whole stake when unbonding', async () => {
    const scope = fork();
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.maxAmountRequested, { scope });

    expect(scope.getState(amountFlowModel.$amount)).toBe('1000');
    expect(scope.getState(amountFlowModel.$isFullUnbond)).toBe(true);
    expect(scope.getState(amountFlowModel.$remainingStake).toString()).toBe('0');
  });

  it('Max offers nothing to add when the account holds no balance', async () => {
    const scope = fork();
    await allSettled(amountFlowModel.addStakeRequested, { scope, params: target() });
    await allSettled(amountFlowModel.maxAmountRequested, { scope });

    expect(scope.getState(amountFlowModel.$amount)).toBe('0');
  });
});

describe('staking-amount-flow · built call', () => {
  it('a partial unbond is a bare unbond, from the position account', async () => {
    const scope = fork({ values: withMinBond(dot(250)) });
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '100' });

    const tx = scope.getState(amountFlowModel.$coreTx);

    expect(scope.getState(amountFlowModel.$withChill)).toBe(false);
    expect(tx?.type).toBe(TransactionType.UNSTAKE);
    expect(tx?.accountId).toBe(ALICE);
    expect(tx?.args['value']).toBe(dot(100));
  });

  it('a full unbond is wrapped as BATCH_ALL(chill, unbond)', async () => {
    const scope = fork({ values: withMinBond(dot(250)) });
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '1000' });

    const tx = scope.getState(amountFlowModel.$coreTx);

    expect(scope.getState(amountFlowModel.$withChill)).toBe(true);
    expect(tx?.type).toBe(TransactionType.BATCH_ALL);
    expect(tx?.args['transactions'].map((inner: { type: string }) => inner.type)).toEqual([
      TransactionType.CHILL,
      TransactionType.UNSTAKE,
    ]);
  });

  it('unbonding below the minimum bond also chills', async () => {
    const scope = fork({ values: withMinBond(dot(250)) });
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '900' });

    expect(scope.getState(amountFlowModel.$withChill)).toBe(true);
    expect(scope.getState(amountFlowModel.$coreTx)?.type).toBe(TransactionType.BATCH_ALL);
  });

  it('unbonding down to exactly the minimum keeps the nominations', async () => {
    const scope = fork({ values: withMinBond(dot(250)) });
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '750' });

    expect(scope.getState(amountFlowModel.$withChill)).toBe(false);
    expect(scope.getState(amountFlowModel.$isBelowMinimumBond)).toBe(false);
    expect(scope.getState(amountFlowModel.$coreTx)?.type).toBe(TransactionType.UNSTAKE);
  });

  it('add stake builds bond-extra, never chills and never warns about the minimum bond', async () => {
    const scope = fork({ values: withMinBond(dot(250)) });
    await allSettled(amountFlowModel.addStakeRequested, { scope, params: target() });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '900' });

    const tx = scope.getState(amountFlowModel.$coreTx);

    expect(tx?.type).toBe(TransactionType.STAKE_MORE);
    expect(tx?.args['maxAdditional']).toBe(dot(900));
    expect(scope.getState(amountFlowModel.$withChill)).toBe(false);
    expect(scope.getState(amountFlowModel.$isBelowMinimumBond)).toBe(false);
  });
});

describe('staking-amount-flow · chain connection', () => {
  it('builds no call while the chain is disconnected', async () => {
    // No seeded statuses at all reads the same as DISCONNECTED — both must
    // refuse to build against a stale or absent api.
    const scope = fork({
      values: new Map().set(networkModel.$connectionStatuses, { [CHAIN_ID]: ConnectionStatus.DISCONNECTED }),
    });
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '100' });

    expect(scope.getState(amountFlowModel.$coreTx)).toBeNull();
    expect(scope.getState(amountFlowModel.$canContinue)).toBe(false);
  });

  it('the draft call ignores the connection — nobody here signs it', async () => {
    const scope = fork();
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '100' });
    await allSettled(amountFlowModel.draftPathCommitted, {
      scope,
      params: [{ kind: 'signer' as const, accountId: ALICE }],
    });

    expect(scope.getState(amountFlowModel.$draftCoreTx)).not.toBeNull();
  });
});

describe('staking-amount-flow · draft branch', () => {
  const signerPath = [{ kind: 'signer' as const, accountId: ALICE }];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a draft instead of signing', async () => {
    const scope = fork();
    const signSpy = vi.fn();

    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '100' });
    await allSettled(amountFlowModel.draftPathCommitted, { scope, params: signerPath });

    const unsubscribe = createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });
    try {
      expect(scope.getState(amountFlowModel.$canSaveAsDraft)).toBe(true);
      // The signing branch is closed while the draft branch is open — one or the
      // other, never both from the same confirmation.
      expect(scope.getState(amountFlowModel.$canContinue)).toBe(false);

      await allSettled(amountFlowModel.saveAsDraftRequested, { scope });

      expect(scope.getState(createDraftModel.$isOpen)).toBe(true);
      expect(scope.getState(amountFlowModel.$step)).toBe(Step.INIT);
      expect(signSpy).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('a created draft ends the flow', async () => {
    const scope = fork();
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(amountFlowModel.amountChanged, { scope, params: '100' });
    await allSettled(amountFlowModel.draftPathCommitted, { scope, params: signerPath });
    await allSettled(amountFlowModel.saveAsDraftRequested, { scope });
    await allSettled(createDraftModel.draftCreated, { scope });

    expect(scope.getState(amountFlowModel.$step)).toBe(Step.NONE);
  });

  it('cannot save a draft without an amount', async () => {
    const scope = fork();
    await allSettled(amountFlowModel.unbondRequested, { scope, params: target() });
    await allSettled(amountFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(amountFlowModel.draftPathCommitted, { scope, params: signerPath });

    expect(scope.getState(amountFlowModel.$canSaveAsDraft)).toBe(false);
  });
});
