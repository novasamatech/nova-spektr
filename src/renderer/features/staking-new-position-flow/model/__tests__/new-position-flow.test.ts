import { BN } from '@polkadot/util';
import { type EventCallable, type Store, allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import {
  type Asset,
  type Chain,
  type ChainId,
  type Wallet,
  ConnectionStatus,
  CryptoType,
  SigningType,
  WalletType,
} from '@/shared/core';
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
    // The verdict is seeded by the test: the rules themselves (over the
    // balance, under the chain minimum) live in `bondNominateValidator` and
    // are tested there. What is checked here is that the flow obeys them.
    createTxValidationStore: () => {
      const $errors = createStore<unknown[]>([]);
      mocks.txErrors = $errors;

      return {
        $errors,
        $balanceValidationResults: createStore<unknown[]>([]),
        $pending: createStore(false),
        $validationDone: createStore(true),
        $valid: $errors.map((errors) => errors.length === 0),
        $failed: $errors.map((errors) => errors.length > 0),
        $available: createStore<unknown[]>([]),
      };
    },
  };
});

const { mocks } = vi.hoisted(() => ({
  mocks: { minBond: null as unknown, chains: null as unknown, txErrors: null as unknown },
}));

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

/**
 * Whether an account fits a chain is decided by a DI `anyOf` registry, and a
 * unit fork boots none — so every account reads as unavailable and the "Stake
 * from" field has nothing to seed itself with. The availability rule has its
 * own tests; here every account fits every chain.
 */
vi.mock('@/domains/network/account/service', async (importOriginal) => {
  const actual = await importOriginal<{ accountService: Record<string, unknown> }>();

  return {
    ...actual,
    accountService: { ...actual.accountService, isAccountAvailableOnChain: () => true },
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
    getSigningMode: ({ isDraftMode }: { isDraftMode: boolean }) => (isDraftMode ? 'draft' : 'local'),
    getDraftSigningInfo: () => undefined,
    validatorSelectionModel: {
      events: { formInitiated: createEvent<unknown>(), formCleared: createEvent() },
      output: { formSubmitted: createEvent<unknown[]>() },
    },
  };
});

const { newPositionFlowModel } = await import('../new-position-flow');
const { networkModel } = await import('@/entities/network');
const { walletModel } = await import('@/entities/wallet');
const { accounts } = await import('@/domains/network');
const { walletSelect } = await import('@/aggregates/wallet-select');
const { basketOperations } = await import('@/aggregates/basket-operations');
const { validatorSelectionModel } = await import('@/features/validator-selection');
const { createDraftModel } = await import('@/features/drafts');

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

/** A draft path of one: the source signs for itself. */
const DRAFT_PATH = [{ kind: 'signer' as const, accountId: ALICE }];

/** The wallet behind `ACCOUNT` (`walletId: 1`) — the basket can sign for it. */
const VAULT_WALLET: Wallet = { id: 1, name: 'Vault', type: WalletType.POLKADOT_VAULT, accounts: [] };

/** Holds a key nobody here can sign with. */
const WATCH_ONLY_WALLET: Wallet = { id: 2, name: 'Watch only', type: WalletType.WATCH_ONLY, accounts: [] };

const WATCHED_ACCOUNT = {
  ...ACCOUNT,
  id: 'account-2',
  name: 'Watched',
  walletId: WATCH_ONLY_WALLET.id,
  accountId: accountId(2),
  signingType: SigningType.WATCH_ONLY,
} as unknown as Wallet['accounts'][number];

/** Signs interactively — the basket cannot sign for it later. */
const WALLET_CONNECT_WALLET: Wallet = { id: 1, name: 'WalletConnect', type: WalletType.WALLET_CONNECT, accounts: [] };

const $chains = () => mocks.chains as Store<unknown[]>;
const $minBond = () => mocks.minBond as Store<Record<string, string>>;
const $txErrors = () => mocks.txErrors as Store<unknown[]>;

const MINIMUM_BOND_ERROR = { rule: 'minimum bond', message: 'staking.belowMinimumBondError' };
const OVER_BALANCE_ERROR = { action: 'amount', balance: { success: false } };

/**
 * What the flow reads about a network — chains, the minimum bond, and a live
 * connection (`$coreTx` refuses to build on a disconnected chain).
 */
const seeded = (minBondPlanck = dot(1)) =>
  new Map()
    .set($chains(), [CHAIN])
    .set($minBond(), { [CHAIN_ID]: minBondPlanck })
    .set(networkModel.$connectionStatuses, { [CHAIN_ID]: ConnectionStatus.CONNECTED });

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

  /**
   * Opening must seed the initiator from what is already loaded, not only from
   * a fresh emission of the account list.
   *
   * This is the reopen case, and the reason the fixture seeds the wallet and
   * account stores without driving an event: by the second open, wallets and
   * accounts settled long ago and will not emit again, while `flowClosed` has
   * already reset the initiator to null. A form whose "Stake from" card comes
   * from the signing path has no path, no available balance and no way to
   * continue until something unrelated happens to re-emit.
   */
  it('seeds the initiator from accounts that were already loaded', async () => {
    const scope = fork({
      values: seeded().set(walletModel.__test.$rawWallets, [VAULT_WALLET]).set(accounts.__test.$list, [ACCOUNT]),
    });

    await allSettled(newPositionFlowModel.newPositionRequested, { scope });

    expect(scope.getState(newPositionFlowModel.$initiator)).toEqual(ACCOUNT);
  });

  /**
   * A watch-only account seeds an empty signing path, and the "Stake from"
   * field is rendered off that path — so it would vanish along with the only
   * way to pick another account. The seed skips such keys even when they belong
   * to the selected wallet.
   */
  it('never seeds a watch-only key, even from the selected wallet', async () => {
    const scope = fork({
      values: seeded()
        .set(walletModel.__test.$rawWallets, [VAULT_WALLET, WATCH_ONLY_WALLET])
        .set(accounts.__test.$list, [ACCOUNT, WATCHED_ACCOUNT])
        .set(walletSelect.__test.$selectedWalletId, WATCH_ONLY_WALLET.id),
    });

    await allSettled(newPositionFlowModel.newPositionRequested, { scope });

    expect(scope.getState(newPositionFlowModel.$initiator)).toEqual(ACCOUNT);
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

  it('refuses a bond the validator rejected — the chain minimum', async () => {
    // `staking.nominate` rejects the stash and the batch fails as a whole, so
    // the shared validator blocks rather than warns; the flow obeys it.
    const scope = fork({ values: seeded().set($txErrors(), [MINIMUM_BOND_ERROR]) });
    await fillForm(scope, '9');

    expect(scope.getState(newPositionFlowModel.$isAmountInvalid)).toBe(true);
    expect(scope.getState(newPositionFlowModel.$canContinue)).toBe(false);

    await allSettled(newPositionFlowModel.continueRequested, { scope });

    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.INIT);
  });

  it('frames the amount for a balance shortfall on the amount itself', async () => {
    const scope = fork({ values: seeded().set($txErrors(), [OVER_BALANCE_ERROR]) });
    await fillForm(scope, '1000');

    expect(scope.getState(newPositionFlowModel.$isAmountInvalid)).toBe(true);
    expect(scope.getState(newPositionFlowModel.$canContinue)).toBe(false);
  });

  it('leaves the amount frame alone for errors elsewhere on the route', async () => {
    const scope = fork({
      values: seeded().set($txErrors(), [{ action: 'multisig deposit', balance: { success: false } }]),
    });
    await fillForm(scope, '10');

    expect(scope.getState(newPositionFlowModel.$isAmountInvalid)).toBe(false);
    expect(scope.getState(newPositionFlowModel.$canContinue)).toBe(false);
  });

  it('continues once the validator is satisfied', async () => {
    const scope = fork({ values: seeded() });
    await fillForm(scope, '10');

    expect(scope.getState(newPositionFlowModel.$isAmountInvalid)).toBe(false);
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

describe('staking-new-position-flow · basket gate', () => {
  /** Walks to the confirm with a built call, the state the basket stores from. */
  async function walkToConfirm(scope: ReturnType<typeof fork>) {
    await fillForm(scope);
    await allSettled(newPositionFlowModel.continueRequested, { scope });
    await allSettled(picker.output.formSubmitted, { scope, params: [validator(7)] });
  }

  it('stores the built call and moves to the BASKET step for a vault wallet', async () => {
    const scope = fork({ values: seeded().set(walletModel.__test.$rawWallets, [VAULT_WALLET]) });
    const stored: unknown[] = [];
    createWatch({ unit: basketOperations.addTransactions, scope, fn: (drafts) => stored.push(...drafts) });

    await walkToConfirm(scope);

    expect(scope.getState(newPositionFlowModel.$canUseBasket)).toBe(true);

    await allSettled(newPositionFlowModel.txSaved, { scope });

    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.BASKET);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ initiatorAccountId: ALICE });
  });

  it('refuses a wallet the basket cannot sign with', async () => {
    const scope = fork({ values: seeded().set(walletModel.__test.$rawWallets, [WALLET_CONNECT_WALLET]) });
    const stored: unknown[] = [];
    createWatch({ unit: basketOperations.addTransactions, scope, fn: (drafts) => stored.push(...drafts) });

    await walkToConfirm(scope);

    expect(scope.getState(newPositionFlowModel.$canUseBasket)).toBe(false);

    await allSettled(newPositionFlowModel.txSaved, { scope });

    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.CONFIRM);
    expect(stored).toHaveLength(0);
  });

  it('refuses while there is no call to store', async () => {
    // The form alone builds nothing — `$coreTx` waits for the validators.
    const scope = fork({ values: seeded().set(walletModel.__test.$rawWallets, [VAULT_WALLET]) });
    await fillForm(scope);

    expect(scope.getState(newPositionFlowModel.$coreTx)).toBeNull();
    expect(scope.getState(newPositionFlowModel.$canUseBasket)).toBe(false);
  });

  it('refuses in draft mode', async () => {
    // Toggled after the call is built, so the draft term is the one deciding.
    const scope = fork({ values: seeded().set(walletModel.__test.$rawWallets, [VAULT_WALLET]) });
    await walkToConfirm(scope);
    await allSettled(newPositionFlowModel.toggleDraftMode, { scope, params: true });

    expect(scope.getState(newPositionFlowModel.$coreTx)).not.toBeNull();
    expect(scope.getState(newPositionFlowModel.$canUseBasket)).toBe(false);
  });
});

describe('staking-new-position-flow · sign gate', () => {
  it('allows signing once the call is built and validated', async () => {
    const scope = fork({ values: seeded() });
    await fillForm(scope);
    await allSettled(newPositionFlowModel.continueRequested, { scope });
    await allSettled(picker.output.formSubmitted, { scope, params: [validator(7)] });

    expect(scope.getState(newPositionFlowModel.$canSign)).toBe(true);
  });

  it('refuses to sign while there is no transaction', async () => {
    // Validation may read `true` (nothing to check yet) — the gate must still
    // hold on the missing call itself.
    const scope = fork({ values: seeded() });
    await fillForm(scope);

    expect(scope.getState(newPositionFlowModel.$canSign)).toBe(false);
  });
});

describe('staking-new-position-flow · draft mode', () => {
  /** Draft mode on, the path committed and an amount typed — the form is done. */
  async function fillDraftForm(scope: ReturnType<typeof fork>, amount = '100') {
    await allSettled(newPositionFlowModel.newPositionRequested, { scope });
    await allSettled(newPositionFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(newPositionFlowModel.draftPathCommitted, { scope, params: DRAFT_PATH });
    await allSettled(newPositionFlowModel.amountChanged, { scope, params: amount });
  }

  it('continues to the validators step without a live verdict, fee or route signer', async () => {
    // Everything the live gate reads — the validation, the fee, the route
    // signer — is about the connected wallet's initiator, not the draft's
    // source. Here the validator even rejects, and the draft still walks on.
    const scope = fork({ values: seeded().set($txErrors(), [OVER_BALANCE_ERROR]) });
    await fillDraftForm(scope);

    expect(scope.getState(newPositionFlowModel.$initiator)).toBeNull();
    expect(scope.getState(newPositionFlowModel.$canContinue)).toBe(true);

    await allSettled(newPositionFlowModel.continueRequested, { scope });

    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.VALIDATORS);
  });

  it('refuses to continue until the draft path is complete', async () => {
    const scope = fork({ values: seeded() });
    await allSettled(newPositionFlowModel.newPositionRequested, { scope });
    await allSettled(newPositionFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(newPositionFlowModel.amountChanged, { scope, params: '100' });

    expect(scope.getState(newPositionFlowModel.$canContinue)).toBe(false);

    await allSettled(newPositionFlowModel.continueRequested, { scope });

    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.INIT);
  });

  it('refuses to continue without an amount', async () => {
    const scope = fork({ values: seeded() });
    await fillDraftForm(scope, '');

    expect(scope.getState(newPositionFlowModel.$canContinue)).toBe(false);
  });

  it('opens the picker scoped to the draft path’s source, in draft mode', async () => {
    const scope = fork({
      values: seeded().set(walletModel.__test.$rawWallets, [VAULT_WALLET]).set(accounts.__test.$list, [ACCOUNT]),
    });
    const initiated: unknown[] = [];
    createWatch({ unit: picker.events.formInitiated, scope, fn: (p) => initiated.push(p) });

    await fillDraftForm(scope);
    // The connected wallet's own pick must not leak into the picker's scope.
    await allSettled(newPositionFlowModel.initiatorChanged, { scope, params: WATCHED_ACCOUNT });
    await allSettled(newPositionFlowModel.continueRequested, { scope });

    expect(initiated).toHaveLength(1);
    expect(initiated[0]).toMatchObject({
      chain: CHAIN,
      asset: ASSET,
      signingMode: 'draft',
      initiator: ACCOUNT,
      initiatorWallet: { id: VAULT_WALLET.id, type: WalletType.POLKADOT_VAULT },
    });
  });

  it('saves the draft off the picker’s submit instead of walking to the confirm', async () => {
    const scope = fork({ values: seeded() });
    const requested: unknown[] = [];
    createWatch({ unit: createDraftModel.createDraftRequested, scope, fn: (seed) => requested.push(seed) });

    await fillDraftForm(scope);
    await allSettled(newPositionFlowModel.continueRequested, { scope });

    // Nothing to save before the validators are known.
    expect(scope.getState(newPositionFlowModel.$canSaveAsDraft)).toBe(false);

    await allSettled(picker.output.formSubmitted, { scope, params: [validator(7), validator(8)] });

    expect(scope.getState(newPositionFlowModel.$validators)).toEqual([validator(7), validator(8)]);
    expect(scope.getState(newPositionFlowModel.$canSaveAsDraft)).toBe(true);
    expect(scope.getState(newPositionFlowModel.$draftCoreTx)).toMatchObject({ chainId: CHAIN_ID, accountId: ALICE });
    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.VALIDATORS);
    expect(scope.getState(newPositionFlowModel.$canSign)).toBe(false);

    expect(requested).toHaveLength(1);
    expect(requested[0]).toMatchObject({
      callData: '0xdeadbeef',
      chainId: CHAIN_ID,
      path: DRAFT_PATH,
      source: 'staking-new-position-flow-draft-mode',
    });
  });

  it('closes once the draft is created', async () => {
    const scope = fork({ values: seeded() });
    await fillDraftForm(scope);
    await allSettled(newPositionFlowModel.continueRequested, { scope });
    await allSettled(picker.output.formSubmitted, { scope, params: [validator(7)] });

    await allSettled(createDraftModel.draftCreated, { scope });

    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.NONE);
  });

  it('leaves the live flow alone: a submit outside draft mode still walks to the confirm', async () => {
    const scope = fork({ values: seeded() });
    const requested: unknown[] = [];
    createWatch({ unit: createDraftModel.createDraftRequested, scope, fn: (seed) => requested.push(seed) });

    await fillForm(scope);
    await allSettled(newPositionFlowModel.continueRequested, { scope });
    await allSettled(picker.output.formSubmitted, { scope, params: [validator(7)] });

    expect(scope.getState(newPositionFlowModel.$step)).toBe(Step.CONFIRM);
    expect(scope.getState(newPositionFlowModel.$canSaveAsDraft)).toBe(false);
    expect(requested).toHaveLength(0);
  });
});
