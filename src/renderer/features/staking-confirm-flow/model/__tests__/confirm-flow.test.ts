import { type Store, type StoreWritable, allSettled, createWatch, fork } from 'effector';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type Asset,
  type Chain,
  type ChainId,
  type Validator,
  type Wallet,
  ConnectionStatus,
  CryptoType,
  SigningType,
  TransactionType,
} from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingPosition } from '@/domains/staking';
import { DEFAULT_SLASHING_SPANS } from '../../lib/slashing-spans';
import { Step } from '../../types';

/**
 * The node is out of scope here.
 *
 * `createComplexTxStore` and `createTxValidationStore` both cost a round trip
 * to a real api, and neither has anything to say about the decisions this model
 * makes — which call is built, whether signing is allowed, which branch a draft
 * takes. They are replaced with the smallest stand-ins that keep the graph
 * honest: the tx store passes the core transaction straight through, so every
 * assertion below is made against the call this model actually built.
 *
 * Each stand-in is recorded so a test can drive it. The model under test is the
 * last thing imported, so the last recorded bag is always its own.
 */
const { stubs } = vi.hoisted(() => ({
  stubs: {
    complex: [] as Record<string, StoreWritable<never>>[],
    validation: [] as Record<string, StoreWritable<never>>[],
  },
}));

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

      const bag = {
        // The self-route a plain account gets from the real store — keeps the
        // route-signer guard honest without the BFS over the account graph.
        $route: initiator.map((account) => (account ? [account] : [])),
        $tx,
        $feeTx: createStore<unknown>(null),
        $pendingWrapping: createStore(false),
        $fee: createStore<unknown>(null),
        $pendingFee: createStore(false),
      };
      stubs.complex.push(bag as never);

      return bag;
    },
    // The real one asks the DI permission registry, which is empty in a unit
    // fork — every account would read as unsignable. The permission check has
    // its own tests; here the terminal hop simply signs.
    createRouteSignerStore: ($route: Store<unknown[]>) => $route.map((route) => route.at(-1) ?? null),
    createTxValidationStore: () => {
      const bag = {
        $errors: createStore<unknown[]>([]),
        $balanceValidationResults: createStore<unknown[]>([]),
        $pending: createStore(false),
        $validationDone: createStore(true),
        $valid: createStore(true),
        $failed: createStore(false),
        $available: createStore<unknown[]>([]),
      };
      stubs.validation.push(bag as never);

      return bag;
    },
  };
});

const { slashingSpansMock } = vi.hoisted(() => ({ slashingSpansMock: vi.fn() }));

vi.mock('@/shared/pallet/staking', async (importOriginal) => {
  const actual = await importOriginal<{ stakingPallet: Record<string, unknown> }>();

  return {
    ...actual,
    stakingPallet: {
      ...actual.stakingPallet,
      storage: {
        ...(actual.stakingPallet['storage'] as object),
        slashingSpans: slashingSpansMock,
      },
    },
  };
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

const { networkModel } = await import('@/entities/network');
const { createDraftModel } = await import('@/features/drafts');
const { signModel } = await import('@/features/operations/OperationSign');
const { confirmFlowModel } = await import('../confirm-flow');
const { confirmModel } = await import('../confirm');

/** The last bag each factory handed out belongs to the model imported last. */
const complexStub = () => stubs.complex.at(-1)!;
const validationStub = () => stubs.validation.at(-1)!;

// --- fixtures ----------------------------------------------------------------

const accountId = (index: number): AccountId => toAccountId(`0x${index.toString(16).padStart(64, '0')}`);

const ALICE = accountId(1);
const BOB = accountId(2);
const CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;

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

const REDEEMABLE = '45000000000';

const position = (redeemable = REDEEMABLE): StakingPosition => ({
  accountId: ALICE,
  chainId: CHAIN_ID,
  stake: {
    accountId: ALICE,
    chainId: CHAIN_ID,
    controller: ALICE,
    stash: ALICE,
    active: '1000',
    total: '1000',
    unlocking: [],
  },
  status: 'active',
  statusReason: null,
  kind: 'nominator',
  validator: null,
  nominations: [],
  activeValidators: [],
  unbonding: [],
  redeemable,
  totalUnbonding: '0',
});

const validator = (id: AccountId): Validator => ({ accountId: id, chainId: CHAIN_ID }) as unknown as Validator;

const changeTarget = (validators: Validator[] = [validator(ALICE), validator(BOB)]) => ({
  position: position(),
  chain: CHAIN,
  asset: ASSET,
  account: ACCOUNT,
  wallet: null,
  validators,
  signingMode: 'local' as const,
});

const redeemTarget = (amount = REDEEMABLE) => ({
  position: position(amount),
  chain: CHAIN,
  asset: ASSET,
  account: ACCOUNT,
  wallet: null,
  amount,
  signingMode: 'local' as const,
});

/** `$coreTx` is gated on the chain being connected — most tests want it open. */
const connected = (values = new Map()) =>
  values.set(networkModel.$connectionStatuses, { [CHAIN_ID]: ConnectionStatus.CONNECTED });

/** An api the mocked pallet never looks at, but `$api` has to be non-null. */
const withApi = () => connected(new Map().set(networkModel.$apis, { [CHAIN_ID]: {} }));

const signerPath = [{ kind: 'signer' as const, accountId: ALICE }];

beforeEach(() => {
  slashingSpansMock.mockReset();
  slashingSpansMock.mockResolvedValue(null);
});

// --- tests -------------------------------------------------------------------

describe('staking-confirm-flow · entry', () => {
  it('changeValidatorsRequested opens the confirm with the picked set', async () => {
    const scope = fork();
    await allSettled(confirmFlowModel.changeValidatorsRequested, { scope, params: changeTarget() });

    expect(scope.getState(confirmFlowModel.$step)).toBe(Step.CONFIRM);
    expect(scope.getState(confirmFlowModel.$mode)).toBe('changeValidators');
    expect(scope.getState(confirmFlowModel.$validators)).toHaveLength(2);
    // A validator change moves nothing.
    expect(scope.getState(confirmFlowModel.$amount)).toBe('0');
  });

  it('redeemRequested opens the confirm with the figure it was handed', async () => {
    const scope = fork();
    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });

    expect(scope.getState(confirmFlowModel.$step)).toBe(Step.CONFIRM);
    expect(scope.getState(confirmFlowModel.$mode)).toBe('redeem');
    expect(scope.getState(confirmFlowModel.$amount)).toBe(REDEEMABLE);
    expect(scope.getState(confirmFlowModel.$validators)).toEqual([]);
  });

  it('closing the flow clears the request', async () => {
    const scope = fork();
    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });
    await allSettled(confirmFlowModel.flowClosed, { scope });

    expect(scope.getState(confirmFlowModel.$step)).toBe(Step.NONE);
    expect(scope.getState(confirmFlowModel.$request)).toBeNull();
  });
});

describe('staking-confirm-flow · built call', () => {
  it('nominates the picked set from the position account, order kept', async () => {
    const scope = fork({ values: connected() });
    await allSettled(confirmFlowModel.changeValidatorsRequested, {
      scope,
      params: changeTarget([validator(BOB), validator(ALICE), validator(BOB)]),
    });

    const tx = scope.getState(confirmFlowModel.$coreTx);

    expect(tx?.type).toBe(TransactionType.NOMINATE);
    expect(tx?.accountId).toBe(ALICE);
    expect(tx?.args['targets']).toEqual([BOB, ALICE]);
  });

  it('builds no call at all for an empty validator set', async () => {
    const scope = fork({ values: connected() });
    await allSettled(confirmFlowModel.changeValidatorsRequested, { scope, params: changeTarget([]) });

    expect(scope.getState(confirmFlowModel.$coreTx)).toBeNull();
    expect(scope.getState(confirmFlowModel.$canSign)).toBe(false);
  });

  it('redeems with the span count the chain reports', async () => {
    slashingSpansMock.mockResolvedValue([
      { validator: ALICE, spans: { spanIndex: 3, lastStart: 0, lastNonzeroSlash: 0, prior: [9, 4] } },
    ]);

    const scope = fork({ values: withApi() });
    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });

    expect(slashingSpansMock).toHaveBeenCalled();
    expect(scope.getState(confirmFlowModel.$numSlashingSpans)).toBe(3);

    const tx = scope.getState(confirmFlowModel.$coreTx);

    expect(tx?.type).toBe(TransactionType.REDEEM);
    expect(tx?.accountId).toBe(ALICE);
    expect(tx?.args['numSlashingSpans']).toBe(3);
  });

  it('falls back — never to zero — on a runtime that dropped the storage', async () => {
    slashingSpansMock.mockResolvedValue(null);

    const scope = fork({ values: withApi() });
    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });

    expect(scope.getState(confirmFlowModel.$coreTx)?.args['numSlashingSpans']).toBe(DEFAULT_SLASHING_SPANS);
  });

  it('falls back when the read itself fails', async () => {
    slashingSpansMock.mockRejectedValue(new Error('disconnected'));

    const scope = fork({ values: withApi() });
    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });

    expect(scope.getState(confirmFlowModel.$coreTx)?.args['numSlashingSpans']).toBe(DEFAULT_SLASHING_SPANS);
  });

  it('builds no call while the chain is disconnected', async () => {
    // A fork with no seeded statuses reads the same way — both must refuse to
    // build against a stale or absent api. The draft path is exempt by design.
    const scope = fork({
      values: new Map().set(networkModel.$connectionStatuses, { [CHAIN_ID]: ConnectionStatus.DISCONNECTED }),
    });
    await allSettled(confirmFlowModel.changeValidatorsRequested, { scope, params: changeTarget() });

    expect(scope.getState(confirmFlowModel.$coreTx)).toBeNull();
    expect(scope.getState(confirmFlowModel.$canSign)).toBe(false);
  });

  it('does not ask the chain about spans for a validator change', async () => {
    const scope = fork({ values: withApi() });
    await allSettled(confirmFlowModel.changeValidatorsRequested, { scope, params: changeTarget() });

    expect(slashingSpansMock).not.toHaveBeenCalled();
  });
});

describe('staking-confirm-flow · sign gate', () => {
  it('allows signing once the call, the fee and the validation have landed', async () => {
    const scope = fork({ values: connected() });
    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });

    expect(scope.getState(confirmFlowModel.$canSign)).toBe(true);
  });

  it('holds Sign while the fee is still being priced', async () => {
    const scope = fork({ values: connected(new Map().set(complexStub()['$pendingFee'], true)) });
    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });

    expect(scope.getState(confirmFlowModel.$preparing)).toBe(true);
    expect(scope.getState(confirmFlowModel.$canSign)).toBe(false);
  });

  it('holds Sign while the validation has not passed', async () => {
    const scope = fork({ values: connected(new Map().set(validationStub()['$valid'], false)) });
    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });

    expect(scope.getState(confirmFlowModel.$canSign)).toBe(false);
  });

  it('refuses a redeem with nothing unlocked behind it', async () => {
    const scope = fork({ values: connected() });
    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget('0') });

    expect(scope.getState(confirmFlowModel.$canSign)).toBe(false);
  });

  it('moves to the sign step when Sign is pressed outside draft mode', async () => {
    const scope = fork();

    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });
    await allSettled(confirmModel.startSigning, { scope });

    expect(scope.getState(confirmFlowModel.$step)).toBe(Step.SIGN);
  });
});

describe('staking-confirm-flow · draft branch', () => {
  it('creates a draft instead of signing', async () => {
    const scope = fork();
    const signSpy = vi.fn();

    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });
    await allSettled(confirmFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(confirmFlowModel.draftPathCommitted, { scope, params: signerPath });

    const unsubscribe = createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });
    try {
      expect(scope.getState(confirmFlowModel.$canSaveAsDraft)).toBe(true);
      // The signing branch is closed while the draft branch is open — one or the
      // other, never both from the same confirmation.
      expect(scope.getState(confirmFlowModel.$canSign)).toBe(false);

      await allSettled(confirmFlowModel.saveAsDraftRequested, { scope });

      expect(scope.getState(createDraftModel.$isOpen)).toBe(true);
      expect(scope.getState(confirmFlowModel.$step)).toBe(Step.CONFIRM);
      expect(signSpy).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('never signs from the draft branch, even if Sign is pressed', async () => {
    const scope = fork();
    const signSpy = vi.fn();

    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });
    await allSettled(confirmFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(confirmFlowModel.draftPathCommitted, { scope, params: signerPath });

    const unsubscribe = createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });
    try {
      await allSettled(confirmModel.startSigning, { scope });

      expect(scope.getState(confirmFlowModel.$step)).toBe(Step.CONFIRM);
      expect(signSpy).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('builds the draft call for the path’s own source account', async () => {
    const scope = fork();

    await allSettled(confirmFlowModel.changeValidatorsRequested, { scope, params: changeTarget() });
    await allSettled(confirmFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(confirmFlowModel.draftPathCommitted, {
      scope,
      params: [{ kind: 'signer' as const, accountId: BOB }],
    });

    const draftTx = scope.getState(confirmFlowModel.$draftCoreTx);

    expect(draftTx?.type).toBe(TransactionType.NOMINATE);
    expect(draftTx?.accountId).toBe(BOB);
  });

  it('a created draft ends the flow', async () => {
    const scope = fork();

    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });
    await allSettled(confirmFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(confirmFlowModel.draftPathCommitted, { scope, params: signerPath });
    await allSettled(confirmFlowModel.saveAsDraftRequested, { scope });
    await allSettled(createDraftModel.draftCreated, { scope });

    expect(scope.getState(confirmFlowModel.$step)).toBe(Step.NONE);
  });

  it('cannot save a draft before the path is complete', async () => {
    const scope = fork();

    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget() });
    await allSettled(confirmFlowModel.toggleDraftMode, { scope, params: true });

    expect(scope.getState(confirmFlowModel.$canSaveAsDraft)).toBe(false);
  });

  it('refuses a redeem draft with nothing unlocked behind it', async () => {
    // `withdraw_unbonded` takes no amount, so the call data itself would build
    // fine — the gate is what keeps a no-op from being saved for somebody else
    // to pay a fee on.
    const scope = fork();

    await allSettled(confirmFlowModel.redeemRequested, { scope, params: redeemTarget('0') });
    await allSettled(confirmFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(confirmFlowModel.draftPathCommitted, { scope, params: signerPath });

    expect(scope.getState(confirmFlowModel.$draftCoreTx)).not.toBeNull();
    expect(scope.getState(confirmFlowModel.$canSaveAsDraft)).toBe(false);
  });
});
