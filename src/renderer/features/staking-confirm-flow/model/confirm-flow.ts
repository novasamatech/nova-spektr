import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { ZERO_BALANCE, nonNullable, nullable } from '@/shared/lib/utils';
import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  createComplexTxStore,
  createRouteSignerStore,
  createTxValidationStore,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { createDraftModeBinding, wireDraftCloseRedirect } from '@/features/drafts';
import { signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { nominateValidator, withdrawValidator } from '@/features/operations/OperationsValidation';
import { createSigningPathModel } from '@/features/signing-path';
import { toNominationTargets } from '../lib/nominations';
import { DEFAULT_SLASHING_SPANS, buildSlashingSpanCounts } from '../lib/slashing-spans';
import {
  type ChangeValidatorsTarget,
  type ConfirmFlowConfirm,
  type ConfirmFlowRequest,
  type RedeemTarget,
  Step,
} from '../types';

import { confirmModel } from './confirm';

/**
 * Change validators and Redeem, as one flow.
 *
 * Neither asks the user for anything: the validator set arrives already picked
 * and `withdraw_unbonded` takes no amount at all, so both open on their
 * confirm. That shared shape — no input step, one position, one signing route,
 * one draft branch — is the whole of the flow; the mode decides which call is
 * built and which single detail row the confirm adds, and nothing else.
 *
 * The sibling of `staking-amount-flow`, which serves the two actions that _do_
 * need an amount.
 */
export const createConfirmFlowModel = () => {
  // --- entry points --------------------------------------------------------

  const changeValidatorsRequested = createEvent<ChangeValidatorsTarget>();
  const redeemRequested = createEvent<RedeemTarget>();
  const flowStarted = createEvent<ConfirmFlowRequest>();
  const flowClosed = createEvent();
  /** A landed extrinsic. The host refreshes what it shows off this. */
  const flowCompleted = createEvent();

  const stepChanged = createEvent<Step>();

  sample({
    clock: changeValidatorsRequested,
    fn: (target): ConfirmFlowRequest => ({ ...target, mode: 'changeValidators', amount: ZERO_BALANCE }),
    target: flowStarted,
  });

  sample({
    clock: redeemRequested,
    fn: (target): ConfirmFlowRequest => ({ ...target, mode: 'redeem', validators: [] }),
    target: flowStarted,
  });

  const $step = createStore(Step.NONE).on(stepChanged, (_, step) => step);

  /**
   * The position the user pressed on, snapshotted.
   *
   * The live position keeps moving with every era and every block; the one
   * being signed must not — a chunk unlocking mid-signature must not change the
   * figure the confirm leads with.
   */
  const $request = createStore<ConfirmFlowRequest | null>(null)
    .on(flowStarted, (_, request) => request)
    .reset(flowClosed);

  sample({
    clock: flowStarted,
    fn: () => Step.CONFIRM,
    target: stepChanged,
  });

  const $mode = $request.map((request) => request?.mode ?? null);
  const $chain = $request.map((request) => request?.chain ?? null);
  const $asset = $request.map((request) => request?.asset ?? null);
  const $position = $request.map((request) => request?.position ?? null);
  const $initiator = $request.map((request) => request?.account ?? null);
  const $wallet = $request.map((request) => request?.wallet ?? null);
  const $validators = $request.map((request) => request?.validators ?? []);
  /** Planck the redeem withdraws; `'0'` for a validator change. */
  const $amount = $request.map((request) => request?.amount ?? ZERO_BALANCE);

  /** Shape `createDraftModeBinding` and the draft save expect. */
  const $networkStore = combine($chain, $asset, (chain, asset) => (chain && asset ? { chain, asset } : null));

  const $api = combine(networkModel.$apis, $chain, (apis, chain) => (chain ? (apis[chain.chainId] ?? null) : null));

  // --- signing route -------------------------------------------------------

  const { $signingPath, signingPathChanged, $signatoryFromPath, $pathRoute } = createSigningPathModel({
    initiator: $initiator,
    chain: $chain,
    resetOn: [flowStarted, flowClosed],
  });

  /**
   * A regular account signs for itself, and for one the signing path is empty
   * by design — falling back to the initiator is what keeps the wrapping step
   * from refusing the transaction and stranding the confirm on a fee that never
   * arrives.
   */
  const $routeSignatory = combine($signatoryFromPath, $initiator, (fromPath, initiator) => fromPath ?? initiator);

  // --- draft mode ----------------------------------------------------------
  //
  // Declared before the transaction because the draft's own source account is
  // one of the stashes whose slashing spans have to be read.

  const draftMode = createDraftModeBinding({ formInitiated: flowStarted, chainChanged: flowStarted });

  const $draftSourceAccountId = draftMode.$draftSigningPath.map((path) => path.at(0)?.accountId ?? null);

  // --- slashing spans ------------------------------------------------------
  //
  // `withdraw_unbonded` is given a span count, and a count that is too small
  // makes the extrinsic fail outright on a stash whose ledger is being closed
  // out. It is therefore read from the chain rather than assumed — for the
  // signing stash and for the draft's source account alike, since the draft is
  // a call for somebody else's ledger.

  const readSlashingSpansFx = createEffect(
    async ({ api, accountIds }: { api: ApiPromise; accountIds: AccountId[] }) => {
      // A failed read must never strand the flow: the fallback is the value the
      // app has always sent, and it is right for every unslashed stash.
      const entries = await stakingPallet.storage.slashingSpans(api, accountIds).catch(() => null);

      return buildSlashingSpanCounts(accountIds, entries);
    },
  );

  const $slashingSpanCounts = createStore<Record<AccountId, number>>({})
    .on(readSlashingSpansFx.doneData, (counts, resolved) => ({ ...counts, ...resolved }))
    .reset(flowStarted, flowClosed);

  /** The stashes this session may build a `withdraw_unbonded` for. */
  const $spanTargets = combine(
    { mode: $mode, initiator: $initiator, draftSource: $draftSourceAccountId },
    ({ mode, initiator, draftSource }): AccountId[] => {
      if (mode !== 'redeem') return [];

      return [...new Set([initiator?.accountId, draftSource].filter(nonNullable))];
    },
  );

  // Clocked on the source stores rather than on the derived ones: emission of a
  // `combine` is not tracked scope-locally under `fork`, and the read must fire
  // once the api for the freshly-set chain is actually resolvable.
  sample({
    clock: [$request, networkModel.$apis, draftMode.$draftSigningPath],
    source: { api: $api, accountIds: $spanTargets },
    filter: ({ api, accountIds }) => nonNullable(api) && accountIds.length > 0,
    fn: ({ api, accountIds }) => ({ api: api!, accountIds }),
    target: readSlashingSpansFx,
  });

  const readSpanCount = (counts: Record<AccountId, number>, accountId: AccountId | null | undefined) =>
    nonNullable(accountId) ? (counts[accountId] ?? DEFAULT_SLASHING_SPANS) : DEFAULT_SLASHING_SPANS;

  const $numSlashingSpans = combine($slashingSpanCounts, $initiator, (counts, initiator) =>
    readSpanCount(counts, initiator?.accountId),
  );

  const $draftNumSlashingSpans = combine($slashingSpanCounts, $draftSourceAccountId, readSpanCount);

  // --- transaction ---------------------------------------------------------

  /**
   * The call this flow signs.
   *
   * The origin is the position's own account, not the signer: for a multisig
   * the inner call must come from the multisig, and the wrapping step then sets
   * the outer origin. Both calls act on the origin's own ledger — unlike a
   * payout, nobody can nominate or withdraw on another stash's behalf.
   */
  const $coreTx = combine(
    {
      mode: $mode,
      chain: $chain,
      initiator: $initiator,
      validators: $validators,
      numSlashingSpans: $numSlashingSpans,
    },
    ({ mode, chain, initiator, validators, numSlashingSpans }) => {
      if (nullable(mode) || nullable(chain) || nullable(initiator)) return null;

      if (mode === 'redeem') {
        return transactionBuilder.buildWithdraw({ chain, accountId: initiator.accountId, numSlashingSpans });
      }

      const nominators = toNominationTargets(validators);
      // `nominate` with an empty target list is rejected on chain.
      if (nominators.length === 0) return null;

      return transactionBuilder.buildNominate({ chain, accountId: initiator.accountId, nominators });
    },
  );

  const { $route, $tx, $fee, $pendingFee, $pendingWrapping } = createComplexTxStore({
    api: $api,
    chain: $chain,
    transaction: $coreTx,
    accounts: accounts.$list,
    initiator: $initiator,
    signatory: $routeSignatory,
    routeOverride: $pathRoute,
  });

  /** Display/draft terminal hop; `$routeSigner` is the permission-checked one. */
  const $signatory = combine($route, $initiator, (route, initiator) => route.at(-1) ?? initiator);

  // --- validation ----------------------------------------------------------

  /**
   * One validation store, two rule sets.
   *
   * Neither operation moves funds out of the signer's balance, so both carry
   * only the shared fee / existential-deposit / permission checks. Dispatching
   * between them here keeps a single round trip per change, and keeps the door
   * open for either rule set to grow its own rules later.
   */
  type ValidateParams = Parameters<typeof withdrawValidator>[0] & { mode: ConfirmFlowRequest['mode'] };

  const validateTx = ({ mode, ...params }: ValidateParams) =>
    mode === 'redeem' ? withdrawValidator(params) : nominateValidator(params);

  const {
    $errors,
    $valid: $isTxValid,
    $pending: $validating,
    $balanceValidationResults,
  } = createTxValidationStore({
    validator: validateTx,
    params: {
      api: $api,
      asset: $asset,
      balances: balanceModel.$balanceMap,
      route: $route,
      transaction: $tx,
      mode: $mode,
    },
  });

  const $hasMultisigAccount = $route.map((route) =>
    route.some((account) => accountUtils.isAnyMultisigAccount(account)),
  );

  const $multisigDeposit = $balanceValidationResults.map((results) =>
    getActionRequiredAmount(results, 'multisig deposit').reduce(
      (deposit, action) => deposit.add(action.required),
      BN_ZERO,
    ),
  );

  const $preparing = combine(
    {
      pendingFee: $pendingFee,
      pendingWrapping: $pendingWrapping,
      validating: $validating,
      readingSpans: readSlashingSpansFx.pending,
    },
    ({ pendingFee, pendingWrapping, validating, readingSpans }) =>
      pendingFee || pendingWrapping || validating || readingSpans,
  );

  // --- draft transaction ---------------------------------------------------

  /**
   * Draft-mode call, built from the path's own source rather than from the
   * connected wallet — the whole point of a draft is that nobody here can sign
   * it, and both calls act on the origin's ledger.
   */
  const $draftCoreTx = combine(
    {
      mode: $mode,
      chain: $chain,
      validators: $validators,
      numSlashingSpans: $draftNumSlashingSpans,
      accountId: $draftSourceAccountId,
      isPathComplete: draftMode.$isDraftPathComplete,
    },
    ({ mode, chain, validators, numSlashingSpans, accountId, isPathComplete }) => {
      if (nullable(mode) || nullable(chain) || nullable(accountId) || !isPathComplete) return null;

      if (mode === 'redeem') {
        return transactionBuilder.buildWithdraw({ chain, accountId, numSlashingSpans });
      }

      const nominators = toNominationTargets(validators);
      if (nominators.length === 0) return null;

      return transactionBuilder.buildNominate({ chain, accountId, nominators });
    },
  );

  const $draftCallDataHex = combine($draftCoreTx, $api, (tx, api) => transactionService.getCallDataHex(tx, api));

  const $canSaveAsDraft = combine(
    {
      isDraftMode: draftMode.$isDraftMode,
      isPathComplete: draftMode.$isDraftPathComplete,
      callData: $draftCallDataHex,
      network: $networkStore,
    },
    ({ isDraftMode, isPathComplete, callData, network }) =>
      isDraftMode && isPathComplete && nonNullable(callData) && nonNullable(network),
  );

  draftMode.connectSave({
    source: 'staking-confirm-flow-draft-mode',
    $callDataHex: $draftCallDataHex,
    $networkStore,
    $canSave: $canSaveAsDraft,
  });

  // A draft is created *instead of* signing, never alongside it: once the draft
  // lands the flow is over and the modal closes.
  wireDraftCloseRedirect({ $initiatedDraft: draftMode.$initiatedDraft, flowFinished: flowClosed });

  // --- sign gate -----------------------------------------------------------

  /**
   * Nothing to redeem is not an operation.
   *
   * The dashboard already refuses to open the flow for a position with no
   * unlocked chunk; the gate is kept here too, because a session that opened
   * against a figure the ledger no longer holds would otherwise pay a fee for a
   * call that moves nothing.
   */
  const $hasSomethingToDo = combine(
    { mode: $mode, amount: $amount, validators: $validators },
    ({ mode, amount, validators }) =>
      mode === 'redeem' ? new BN(amount).gt(BN_ZERO) : toNominationTargets(validators).length > 0,
  );

  const $routeSigner = createRouteSignerStore($route);

  /**
   * No one on the resolved route can actually sign: the position belongs to a
   * contact (no initiator at all) or to a watch-only account. Blocks the gate
   * and surfaces an explicit message instead of a silently dead button.
   */
  const $noRouteSigner = combine(
    { isDraftMode: draftMode.$isDraftMode, request: $request, routeSigner: $routeSigner },
    ({ isDraftMode, request, routeSigner }) => !isDraftMode && nonNullable(request) && nullable(routeSigner),
  );

  const $canSign = combine(
    {
      isDraftMode: draftMode.$isDraftMode,
      hasSomethingToDo: $hasSomethingToDo,
      txValid: $isTxValid,
      preparing: $preparing,
      tx: $tx,
      noRouteSigner: $noRouteSigner,
    },
    ({ isDraftMode, hasSomethingToDo, txValid, preparing, tx, noRouteSigner }) =>
      !isDraftMode && hasSomethingToDo && txValid && !preparing && nonNullable(tx) && !noRouteSigner,
  );

  // --- confirm → sign → submit --------------------------------------------

  const $confirmDraft = combine(
    {
      request: $request,
      signatory: $signatory,
      route: $route,
      tx: $tx,
      coreTx: $coreTx,
    },
    ({ request, signatory, route, tx, coreTx }): ConfirmFlowConfirm | null => {
      if (nullable(request) || nullable(request.account) || nullable(signatory) || nullable(tx) || nullable(coreTx)) {
        return null;
      }

      return {
        chain: request.chain,
        initiator: request.account,
        signatory,
        route: route.length > 0 ? route : [request.account],
        tx,
        coreTx,
        mode: request.mode,
        amount: request.amount,
        validators: request.validators,
      };
    },
  );

  sample({
    clock: [stepChanged, $tx],
    source: { draft: $confirmDraft, step: $step },
    filter: ({ draft, step }) => nonNullable(draft) && step === Step.CONFIRM,
    fn: ({ draft }) => [draft!],
    target: confirmModel.init,
  });

  sample({
    clock: confirmModel.startSigning,
    source: draftMode.$isDraftMode,
    filter: (isDraftMode) => !isDraftMode,
    fn: () => Step.SIGN,
    target: stepChanged,
  });

  const sign = sample({
    clock: confirmModel.startSigning,
    source: { confirms: confirmModel.$confirms, isDraftMode: draftMode.$isDraftMode },
    filter: ({ isDraftMode }) => !isDraftMode,
    fn: ({ confirms }) => ({
      signingPayloads: confirms.map((confirm) => ({
        chain: confirm.meta.chain,
        account: confirm.meta.initiator,
        signatory: confirm.meta.signatory,
        transaction: confirm.meta.tx,
      })),
    }),
  });

  sample({
    clock: sign.filter({ fn: ({ signingPayloads }) => signingPayloads.length > 0 }),
    target: signModel.events.formInitiated,
  });

  // `signModel.signed` is global — every operation in the app signs through it.
  // Only a flow standing *at* the sign step may claim the signature; one parked
  // on CONFIRM would otherwise submit a foreign payload as its own.
  sample({
    clock: signModel.signed,
    source: $step,
    filter: (step) => step === Step.SIGN,
    fn: (_, payload) => payload,
    target: submitModel.init,
  });

  sample({
    clock: signModel.signed,
    source: $step,
    filter: (step) => step === Step.SIGN,
    fn: () => Step.SUBMIT,
    target: stepChanged,
  });

  sample({
    clock: submitModel.done,
    source: $step,
    filter: (step, results) =>
      step === Step.SUBMIT && results.some((result) => result.result === ExtrinsicResult.SUCCESS),
    fn: () => undefined,
    target: flowCompleted,
  });

  sample({
    clock: flowClosed,
    fn: () => Step.NONE,
    target: [stepChanged, confirmModel.resetConfirm],
  });

  return {
    $step: readonly($step),
    $request,
    $mode,
    $chain,
    $asset,
    $position,
    $initiator,
    $wallet,
    $validators,
    $amount,
    $signatory,
    $route,
    $signingPath,
    $numSlashingSpans,

    /** The unwrapped call this flow builds — before any multisig/proxy wrapping. */
    $coreTx,
    $draftCoreTx,
    $tx,
    $fee,
    $pendingFee,
    $errors,
    $hasMultisigAccount,
    $multisigDeposit,
    $preparing,
    $noRouteSigner,
    $canSign,
    $confirms: confirmModel.$confirms,

    $isDraftMode: draftMode.$isDraftMode,
    /**
     * This flow asked for a draft and the create-draft modal has not closed
     * since. A host reads it on `createDraftModel.draftCreated` to tell "the
     * draft that just landed is mine" from any other draft in the app.
     */
    $initiatedDraft: draftMode.$initiatedDraft,
    $isDraftPathComplete: draftMode.$isDraftPathComplete,
    $draftSigningPath: draftMode.$draftSigningPath,
    $canSaveAsDraft,

    changeValidatorsRequested,
    redeemRequested,
    flowStarted,
    flowClosed,
    flowCompleted,
    stepChanged,
    signingPathChanged,
    startSigning: confirmModel.startSigning,

    toggleDraftMode: draftMode.draftModeToggled,
    saveAsDraftRequested: draftMode.saveAsDraftRequested,
    draftPathCommitted: draftMode.draftPathCommitted,
    draftPathEditStarted: draftMode.draftPathEditStarted,
    draftPathEditEnded: draftMode.draftPathEditEnded,
  };
};

/**
 * One instance, created at module load.
 *
 * The factory installs samples into shared graphs (`pathModel`, `signModel`,
 * `createDraftModel`), so a second instance would double-wire them. Tests fork
 * this one instead of building their own.
 */
export const confirmFlowModel = createConfirmFlowModel();

export const confirmFlowUtils = {
  isNoneStep: (step: Step) => step === Step.NONE,
  isConfirmStep: (step: Step) => step === Step.CONFIRM,
  isSignStep: (step: Step) => step === Step.SIGN,
  isSubmitStep: (step: Step) => step === Step.SUBMIT,
};
