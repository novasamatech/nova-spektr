import { type Store, type StoreWritable, allSettled, createWatch, fork } from 'effector';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Wallet, ConnectionStatus, CryptoType, SigningType, TransactionType } from '@/shared/core';
import { type RecipientWarning } from '@/shared/lib/recipient-verification';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { createPolkadotWallet, dotAsset, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Payee, type StakingPosition } from '@/domains/staking';
import { Step } from '../../types';

/**
 * The node is out of scope here.
 *
 * `createComplexTxStore` and `createTxValidationStore` both cost a round trip
 * to a real api, and neither has anything to say about the decisions this model
 * makes — which call is built, whether the selection changed, whether the
 * unknown-recipient gate holds. They are replaced with the smallest stand-ins
 * that keep the graph honest: the tx store passes the core transaction straight
 * through, so every assertion below is made against the call this model built.
 */
// The validation verdict is a writable store so a test can turn it off.
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
    createRouteSignerStore: ($route: Store<unknown[]>) => $route.map((route) => route.at(-1) ?? null),
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

// The recipient verdict is owned by the backend-health aggregate; here it is a
// writable store so each test can decide what the address book knows.
const { resolveWarningMock } = vi.hoisted(() => ({ resolveWarningMock: { $store: null as unknown } }));

vi.mock('@/aggregates/recipient-verification', async () => {
  const { createStore } = await import('effector');
  const $resolveWarning = createStore<(accountId: AccountId | null) => RecipientWarning>(() => 'none');
  resolveWarningMock.$store = $resolveWarning;

  return { recipientVerificationModel: { $resolveWarning, $mode: createStore('off') } };
});

// The basket writes to storage; here it only has to be observable.
vi.mock('@/aggregates/basket-operations', async (importOriginal) => {
  const actual = await importOriginal<{ basketOperations: Record<string, unknown> }>();
  const { createEffect } = await import('effector');

  return {
    ...actual,
    basketOperations: { ...actual.basketOperations, addTransactions: createEffect(() => []) },
  };
});

// Contacts feed the picker only; the picker is not under test here. Only the
// list is replaced — other modules in the import graph read the rest of the
// model and would refuse a bare stub.
vi.mock('@/entities/contact', async (importOriginal) => {
  const actual = await importOriginal<{ contactModel: Record<string, unknown> }>();
  const { createStore } = await import('effector');

  return { ...actual, contactModel: { ...actual.contactModel, $contacts: createStore([]) } };
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

const { payeeFlowModel } = await import('../payee-flow');
const { networkModel } = await import('@/entities/network');
const { createDraftModel } = await import('@/features/drafts');
const { signModel } = await import('@/features/operations/OperationSign');
const { ExtrinsicResult, submitModel } = await import('@/features/operations/OperationSubmit');
const { basketOperations } = await import('@/aggregates/basket-operations');

// --- fixtures ----------------------------------------------------------------

const accountId = (index: number): AccountId => toAccountId(`0x${index.toString(16).padStart(64, '0')}`);

const ALICE = accountId(1);
const BOB = accountId(2);
const CHAIN_ID = polkadotChainId;
const ASSET = dotAsset;
const CHAIN = polkadotChain;

const aliceAddress = toAddress(ALICE, { prefix: 0 });
const bobAddress = toAddress(BOB, { prefix: 0 });

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

const position = (payee: Payee | null = 'Staked', payeeLoaded = true): StakingPosition => ({
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
  redeemable: '0',
  totalUnbonding: '0',
  payee,
  payeeLoaded,
});

/** A wallet the basket can sign with — Polkadot Vault. */
const WALLET = createPolkadotWallet(ACCOUNT.walletId, { rootAccountId: ALICE, name: 'Alice vault' });

const target = (payee: Payee | null = 'Staked') => ({
  position: position(payee),
  chain: CHAIN,
  asset: ASSET,
  account: ACCOUNT,
  wallet: null,
  signingMode: 'local' as const,
});

const $resolveWarning = () =>
  resolveWarningMock.$store as StoreWritable<(accountId: AccountId | null) => RecipientWarning>;

const $txValid = () => validationMock.$valid as StoreWritable<boolean>;

/** `$coreTx` is gated on the chain being connected — most tests want it open. */
const connected = (values = new Map()) =>
  values.set(networkModel.$connectionStatuses, { [CHAIN_ID]: ConnectionStatus.CONNECTED });

const withUnknownRecipient = (values = new Map()) =>
  connected(values).set($resolveWarning(), (id: AccountId | null) => (id === null ? 'none' : 'unknown'));

const signerPath = [{ kind: 'signer' as const, accountId: ALICE }];

const pickAccount = async (scope: ReturnType<typeof fork>, address: string) => {
  await allSettled(payeeFlowModel.optionChanged, { scope, params: 'account' });
  await allSettled(payeeFlowModel.addressChanged, { scope, params: address });
};

// --- tests -------------------------------------------------------------------

describe('staking-payee-flow · entry and pre-selection', () => {
  it('opens the form pre-selected on Restake for a staked payee', async () => {
    const scope = fork();
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });

    expect(scope.getState(payeeFlowModel.$step)).toBe(Step.INIT);
    expect(scope.getState(payeeFlowModel.$option)).toBe('restake');
    expect(scope.getState(payeeFlowModel.$address)).toBe('');
  });

  it('pre-selects the account and fills its address for an Account payee', async () => {
    const scope = fork();
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, {
      scope,
      params: target({ Account: bobAddress }),
    });

    expect(scope.getState(payeeFlowModel.$option)).toBe('account');
    expect(scope.getState(payeeFlowModel.$address)).toBe(bobAddress);
  });

  it('pre-selects the account with the stash address for a Stash payee', async () => {
    const scope = fork();
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Stash') });

    expect(scope.getState(payeeFlowModel.$option)).toBe('account');
    expect(scope.getState(payeeFlowModel.$address)).toBe(aliceAddress);
  });

  it('closing the flow clears the request and the selection', async () => {
    const scope = fork();
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target() });
    await pickAccount(scope, bobAddress);
    await allSettled(payeeFlowModel.flowClosed, { scope });

    expect(scope.getState(payeeFlowModel.$step)).toBe(Step.NONE);
    expect(scope.getState(payeeFlowModel.$request)).toBeNull();
    expect(scope.getState(payeeFlowModel.$option)).toBe('restake');
    expect(scope.getState(payeeFlowModel.$address)).toBe('');
  });
});

describe('staking-payee-flow · built call', () => {
  it('Restake builds set_payee Staked from the position account', async () => {
    const scope = fork({ values: connected() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, {
      scope,
      params: target({ Account: bobAddress }),
    });
    await allSettled(payeeFlowModel.optionChanged, { scope, params: 'restake' });

    const tx = scope.getState(payeeFlowModel.$coreTx);

    expect(tx?.type).toBe(TransactionType.DESTINATION);
    expect(tx?.accountId).toBe(ALICE);
    expect(tx?.args['payee']).toBe('Staked');
  });

  it('an account builds set_payee { Account } from the position account, never the signatory', async () => {
    const scope = fork({ values: connected() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await pickAccount(scope, bobAddress);

    const tx = scope.getState(payeeFlowModel.$coreTx);

    expect(tx?.type).toBe(TransactionType.DESTINATION);
    expect(tx?.accountId).toBe(ALICE);
    expect(tx?.args['payee']).toEqual({ Account: bobAddress });
  });

  it('builds nothing for an invalid address', async () => {
    const scope = fork({ values: connected() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await pickAccount(scope, 'not-an-address');

    expect(scope.getState(payeeFlowModel.$isAddressValid)).toBe(false);
    expect(scope.getState(payeeFlowModel.$coreTx)).toBeNull();
  });

  it('builds no call while the chain is disconnected', async () => {
    const scope = fork({
      values: new Map().set(networkModel.$connectionStatuses, { [CHAIN_ID]: ConnectionStatus.DISCONNECTED }),
    });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await pickAccount(scope, bobAddress);

    expect(scope.getState(payeeFlowModel.$coreTx)).toBeNull();
    expect(scope.getState(payeeFlowModel.$canContinue)).toBe(false);
  });
});

describe('staking-payee-flow · continue', () => {
  it('blocks Continue while nothing changed', async () => {
    const scope = fork({ values: connected() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });

    expect(scope.getState(payeeFlowModel.$hasChanged)).toBe(false);
    expect(scope.getState(payeeFlowModel.$canContinue)).toBe(false);

    await allSettled(payeeFlowModel.continueRequested, { scope });
    expect(scope.getState(payeeFlowModel.$step)).toBe(Step.INIT);
  });

  it('re-picking the current account is not a change either', async () => {
    const scope = fork({ values: connected() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, {
      scope,
      params: target({ Account: bobAddress }),
    });
    // The same key, typed with the generic prefix.
    await pickAccount(scope, toAddress(BOB, { prefix: 42 }));

    expect(scope.getState(payeeFlowModel.$hasChanged)).toBe(false);
    expect(scope.getState(payeeFlowModel.$canContinue)).toBe(false);
  });

  it('reaches CONFIRM once the destination changed', async () => {
    const scope = fork({ values: connected() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await pickAccount(scope, bobAddress);

    expect(scope.getState(payeeFlowModel.$canContinue)).toBe(true);

    await allSettled(payeeFlowModel.continueRequested, { scope });
    expect(scope.getState(payeeFlowModel.$step)).toBe(Step.CONFIRM);
  });

  it('an unread payee lets any selection through', async () => {
    const scope = fork({ values: connected() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target(null) });

    expect(scope.getState(payeeFlowModel.$hasChanged)).toBe(true);
    expect(scope.getState(payeeFlowModel.$canContinue)).toBe(true);
  });
});

describe('staking-payee-flow · unknown recipient', () => {
  it('gates signing on the acknowledgement when the address is unknown', async () => {
    const scope = fork({ values: withUnknownRecipient() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await pickAccount(scope, bobAddress);

    expect(scope.getState(payeeFlowModel.$recipientWarning)).toBe('unknown');
    // The form still walks on to the confirm — the box lives there.
    expect(scope.getState(payeeFlowModel.$canContinue)).toBe(true);
    expect(scope.getState(payeeFlowModel.$canSign)).toBe(false);

    await allSettled(payeeFlowModel.riskAcknowledgedToggled, { scope, params: true });
    expect(scope.getState(payeeFlowModel.$canSign)).toBe(true);
  });

  it('forgets the acknowledgement when the address changes', async () => {
    const scope = fork({ values: withUnknownRecipient() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await pickAccount(scope, bobAddress);
    await allSettled(payeeFlowModel.riskAcknowledgedToggled, { scope, params: true });
    await allSettled(payeeFlowModel.addressChanged, { scope, params: toAddress(accountId(3), { prefix: 0 }) });

    expect(scope.getState(payeeFlowModel.$canSign)).toBe(false);
  });

  it('never warns about Restake', async () => {
    const scope = fork({ values: withUnknownRecipient() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, {
      scope,
      params: target({ Account: bobAddress }),
    });
    await allSettled(payeeFlowModel.optionChanged, { scope, params: 'restake' });

    expect(scope.getState(payeeFlowModel.$recipientWarning)).toBe('none');
    expect(scope.getState(payeeFlowModel.$canSign)).toBe(true);
  });

  it('draft mode is exempt — the warning fires when the draft is signed', async () => {
    const scope = fork({ values: withUnknownRecipient() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await allSettled(payeeFlowModel.toggleDraftMode, { scope, params: true });
    await pickAccount(scope, bobAddress);
    await allSettled(payeeFlowModel.draftPathCommitted, { scope, params: signerPath });

    expect(scope.getState(payeeFlowModel.$recipientWarning)).toBe('unknown');
    expect(scope.getState(payeeFlowModel.$canSaveAsDraft)).toBe(true);
  });
});

describe('staking-payee-flow · draft branch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('a draft request opens with draft mode on', async () => {
    const scope = fork();
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, {
      scope,
      params: { ...target(), account: null, signingMode: 'draft' as const },
    });

    expect(scope.getState(payeeFlowModel.$isDraftMode)).toBe(true);
  });

  it('creates a draft instead of signing, from the position account as origin', async () => {
    const scope = fork();
    const signSpy = vi.fn();

    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await allSettled(payeeFlowModel.toggleDraftMode, { scope, params: true });
    await pickAccount(scope, bobAddress);
    await allSettled(payeeFlowModel.draftPathCommitted, { scope, params: signerPath });

    const unsubscribe = createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });
    try {
      const draftTx = scope.getState(payeeFlowModel.$draftCoreTx);
      expect(draftTx?.type).toBe(TransactionType.DESTINATION);
      expect(draftTx?.accountId).toBe(ALICE);
      expect(draftTx?.args['payee']).toEqual({ Account: bobAddress });

      expect(scope.getState(payeeFlowModel.$canSaveAsDraft)).toBe(true);
      // One branch or the other, never both from the same form.
      expect(scope.getState(payeeFlowModel.$canContinue)).toBe(false);

      await allSettled(payeeFlowModel.saveAsDraftRequested, { scope });

      expect(scope.getState(createDraftModel.$isOpen)).toBe(true);
      expect(scope.getState(payeeFlowModel.$step)).toBe(Step.INIT);
      expect(signSpy).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('refuses a draft whose source is not the position account', async () => {
    const scope = fork();
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await allSettled(payeeFlowModel.toggleDraftMode, { scope, params: true });
    await pickAccount(scope, bobAddress);
    // A complete path that starts somewhere else has no rights over this stash.
    await allSettled(payeeFlowModel.draftPathCommitted, {
      scope,
      params: [{ kind: 'signer' as const, accountId: BOB }],
    });

    expect(scope.getState(payeeFlowModel.$isDraftPathComplete)).toBe(true);
    expect(scope.getState(payeeFlowModel.$draftCoreTx)).toBeNull();
    expect(scope.getState(payeeFlowModel.$canSaveAsDraft)).toBe(false);
  });

  it('cannot save a draft while nothing changed', async () => {
    const scope = fork();
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await allSettled(payeeFlowModel.toggleDraftMode, { scope, params: true });
    await allSettled(payeeFlowModel.draftPathCommitted, { scope, params: signerPath });

    expect(scope.getState(payeeFlowModel.$canSaveAsDraft)).toBe(false);
  });

  it('a created draft ends the flow', async () => {
    const scope = fork();
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await allSettled(payeeFlowModel.toggleDraftMode, { scope, params: true });
    await pickAccount(scope, bobAddress);
    await allSettled(payeeFlowModel.draftPathCommitted, { scope, params: signerPath });
    await allSettled(payeeFlowModel.saveAsDraftRequested, { scope });
    await allSettled(createDraftModel.draftCreated, { scope });

    expect(scope.getState(payeeFlowModel.$step)).toBe(Step.NONE);
  });
});

describe('staking-payee-flow · gates', () => {
  it('blocks Continue when nobody on the route can sign', async () => {
    const scope = fork({ values: connected() });
    // A position with no local account behind it, opened in signed mode.
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, {
      scope,
      params: { ...target('Staked'), account: null },
    });
    await pickAccount(scope, bobAddress);

    expect(scope.getState(payeeFlowModel.$noRouteSigner)).toBe(true);
    expect(scope.getState(payeeFlowModel.$canContinue)).toBe(false);

    await allSettled(payeeFlowModel.continueRequested, { scope });
    expect(scope.getState(payeeFlowModel.$step)).toBe(Step.INIT);
  });

  it('blocks Continue while the transaction fails validation', async () => {
    const scope = fork({ values: connected().set($txValid(), false) });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await pickAccount(scope, bobAddress);

    expect(scope.getState(payeeFlowModel.$isSelectionValid)).toBe(true);
    expect(scope.getState(payeeFlowModel.$canContinue)).toBe(false);

    await allSettled(payeeFlowModel.continueRequested, { scope });
    expect(scope.getState(payeeFlowModel.$step)).toBe(Step.INIT);
  });

  it('refuses to sign an unacknowledged unknown recipient, even from the confirm', async () => {
    const scope = fork({ values: withUnknownRecipient() });
    const signSpy = vi.fn();

    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await pickAccount(scope, bobAddress);
    await allSettled(payeeFlowModel.continueRequested, { scope });
    expect(scope.getState(payeeFlowModel.$step)).toBe(Step.CONFIRM);

    const unsubscribe = createWatch({ unit: signModel.events.formInitiated, fn: signSpy, scope });
    try {
      await allSettled(payeeFlowModel.startSigning, { scope });

      expect(scope.getState(payeeFlowModel.$step)).toBe(Step.CONFIRM);
      expect(signSpy).not.toHaveBeenCalled();

      // The same click walks on once the box is ticked. (The signing payload
      // itself needs a live confirm store — an api — so only the step is asserted.)
      await allSettled(payeeFlowModel.riskAcknowledgedToggled, { scope, params: true });
      await allSettled(payeeFlowModel.startSigning, { scope });

      expect(scope.getState(payeeFlowModel.$step)).toBe(Step.SIGN);
    } finally {
      unsubscribe();
    }
  });
});

describe('staking-payee-flow · basket', () => {
  it('stores the core call in the basket and shows the basket result', async () => {
    const scope = fork({ values: connected() });
    const basketSpy = vi.fn();

    await allSettled(payeeFlowModel.changeRewardDestinationRequested, {
      scope,
      params: { ...target('Staked'), wallet: WALLET },
    });
    await pickAccount(scope, bobAddress);
    await allSettled(payeeFlowModel.continueRequested, { scope });

    expect(scope.getState(payeeFlowModel.$canUseBasket)).toBe(true);

    const unsubscribe = createWatch({ unit: basketOperations.addTransactions, fn: basketSpy, scope });
    try {
      await allSettled(payeeFlowModel.txSaved, { scope });

      const coreTx = scope.getState(payeeFlowModel.$coreTx);
      expect(basketSpy).toHaveBeenCalledTimes(1);
      expect(basketSpy.mock.calls[0]?.[0]).toEqual([
        expect.objectContaining({ initiatorAccountId: ALICE, coreTx, route: [ACCOUNT] }),
      ]);
      expect(scope.getState(payeeFlowModel.$step)).toBe(Step.BASKET);
    } finally {
      unsubscribe();
    }
  });

  it('offers no basket without a wallet the basket can sign with', async () => {
    const scope = fork({ values: connected() });
    const basketSpy = vi.fn();

    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await pickAccount(scope, bobAddress);

    expect(scope.getState(payeeFlowModel.$canUseBasket)).toBe(false);

    const unsubscribe = createWatch({ unit: basketOperations.addTransactions, fn: basketSpy, scope });
    try {
      await allSettled(payeeFlowModel.txSaved, { scope });

      expect(basketSpy).not.toHaveBeenCalled();
      expect(scope.getState(payeeFlowModel.$step)).toBe(Step.INIT);
    } finally {
      unsubscribe();
    }
  });
});

describe('staking-payee-flow · completion', () => {
  type SubmitResult = NonNullable<Parameters<typeof submitModel.done>[0]>[number];

  // Only `result` is read by the flow; the extrinsic params are the node's business.
  const success = { id: 0, result: ExtrinsicResult.SUCCESS, params: {} } as unknown as SubmitResult;
  const failure = { id: 0, result: ExtrinsicResult.ERROR, params: 'boom' } as unknown as SubmitResult;

  const watchCompleted = (scope: ReturnType<typeof fork>) => {
    const spy = vi.fn();
    const unsubscribe = createWatch({ unit: payeeFlowModel.flowCompleted, fn: spy, scope });

    return { spy, unsubscribe };
  };

  it('completes on a successful extrinsic at the submit step', async () => {
    const scope = fork({ values: connected() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await allSettled(payeeFlowModel.stepChanged, { scope, params: Step.SUBMIT });

    const { spy, unsubscribe } = watchCompleted(scope);
    try {
      await allSettled(submitModel.done, { scope, params: [success] });
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  it('does not complete on a failed extrinsic', async () => {
    const scope = fork({ values: connected() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await allSettled(payeeFlowModel.stepChanged, { scope, params: Step.SUBMIT });

    const { spy, unsubscribe } = watchCompleted(scope);
    try {
      await allSettled(submitModel.done, { scope, params: [failure] });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('ignores a submission that lands while the flow is not at the submit step', async () => {
    const scope = fork({ values: connected() });
    await allSettled(payeeFlowModel.changeRewardDestinationRequested, { scope, params: target('Staked') });
    await pickAccount(scope, bobAddress);
    await allSettled(payeeFlowModel.continueRequested, { scope });

    const { spy, unsubscribe } = watchCompleted(scope);
    try {
      // Another operation's submission — `submitModel` is app-wide.
      await allSettled(submitModel.done, { scope, params: [success] });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });
});
