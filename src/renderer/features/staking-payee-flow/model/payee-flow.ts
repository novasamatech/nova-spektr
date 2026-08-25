import { BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Transaction } from '@/shared/core';
import { nonNullable, nullable, toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import {
  MULTISIG_DEPOSIT_ACTION,
  createComplexTxStore,
  createRouteSignerStore,
  createTxValidationStore,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { basketUtils } from '@/entities/basket';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { recipientVerificationModel } from '@/aggregates/recipient-verification';
import { createDraftModeBinding, wireDraftCloseRedirect } from '@/features/drafts';
import { signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { payeeValidator } from '@/features/operations/OperationsValidation';
import { createSigningPathModel } from '@/features/signing-path';
import { hasSelectionChanged, toDestination, toInitialSelection } from '../lib/payee-selection';
import { type PayeeFlowConfirm, type PayeeFlowTarget, type PayeeOption, type PayeeSelection, Step } from '../types';

import { confirmModel } from './confirm';

/**
 * Change reward destination, as one flow.
 *
 * The sibling of `staking-amount-flow`: one position, one form, one signing
 * route, one draft branch. The form asks a single question — restake, or pay
 * out to which account — and the answer is the only thing the call encodes.
 */
export const createPayeeFlowModel = () => {
  // --- entry points --------------------------------------------------------

  const changeRewardDestinationRequested = createEvent<PayeeFlowTarget>();
  const flowStarted = createEvent<PayeeFlowTarget>();
  const flowClosed = createEvent();
  /** A landed extrinsic. The host refreshes what it shows off this. */
  const flowCompleted = createEvent();

  const stepChanged = createEvent<Step>();
  const optionChanged = createEvent<PayeeOption>();
  const addressChanged = createEvent<string>();
  const riskAcknowledgedToggled = createEvent<boolean>();
  const continueRequested = createEvent();
  const txSaved = createEvent();

  sample({ clock: changeRewardDestinationRequested, target: flowStarted });

  const $step = createStore(Step.NONE).on(stepChanged, (_, step) => step);

  /**
   * The position the user pressed on, snapshotted. The live payee keeps
   * re-emitting with every block; the one the form opened on must not move
   * under a half-typed address.
   */
  const $request = createStore<PayeeFlowTarget | null>(null)
    .on(flowStarted, (_, request) => request)
    .reset(flowClosed);

  sample({
    clock: flowStarted,
    fn: () => Step.INIT,
    target: stepChanged,
  });

  const $chain = $request.map((request) => request?.chain ?? null);
  const $asset = $request.map((request) => request?.asset ?? null);
  const $position = $request.map((request) => request?.position ?? null);
  const $initiator = $request.map((request) => request?.account ?? null);
  const $wallet = $request.map((request) => request?.wallet ?? null);

  /** Shape `createDraftModeBinding` and the draft save expect. */
  const $networkStore = combine($chain, $asset, (chain, asset) => (chain && asset ? { chain, asset } : null));

  const $api = combine(networkModel.$apis, $chain, (apis, chain) => (chain ? (apis[chain.chainId] ?? null) : null));

  /**
   * No connection → no `$coreTx` → no fee and nothing to sign. The draft path
   * stays ungated on purpose — a draft is call data for somebody else to sign
   * later, and building it needs no live connection.
   */
  const $isChainConnected = combine(networkModel.$connectionStatuses, $chain, (statuses, chain) => {
    if (!chain) return false;

    const status = statuses[chain.chainId];
    if (!status) return false;

    return networkUtils.isConnectedStatus(status);
  });

  // --- selection -----------------------------------------------------------

  const $option = createStore<PayeeOption>('restake')
    .on(optionChanged, (_, option) => option)
    .reset(flowClosed);

  const $address = createStore('')
    .on(addressChanged, (_, address) => address)
    .reset(flowClosed);

  /**
   * Seeded from the clock payload, not from `$position`: the derived stores
   * update in the same tick, and reading them here would be a bet on effector's
   * ordering that the payload makes unnecessary.
   */
  const initialSelection = sample({
    clock: flowStarted,
    fn: ({ position, chain }): PayeeSelection =>
      toInitialSelection(position.payee, toAddress(position.stake.stash, { prefix: chain.addressPrefix })),
  });

  sample({ clock: initialSelection, fn: ({ option }) => option, target: $option });
  sample({ clock: initialSelection, fn: ({ address }) => address, target: $address });

  const $selection = combine($option, $address, (option, address): PayeeSelection => ({ option, address }));

  const $isAddressValid = combine($address, $chain, (address, chain) =>
    chain ? validateAddress(address, chain) : validateAddress(address),
  );

  /** The picked payout account, `null` for Restake or an unfinished address. */
  const $destinationAccountId = combine(
    { option: $option, address: $address, valid: $isAddressValid },
    ({ option, address, valid }) => (option === 'account' && valid ? toAccountId(address) : null),
  );

  const $hasChanged = combine($position, $selection, (position, selection) =>
    hasSelectionChanged(position?.payee ?? null, selection),
  );

  /** Restake is always complete; an account needs a real address. */
  const $isSelectionValid = combine(
    { option: $option, valid: $isAddressValid, hasChanged: $hasChanged },
    ({ option, valid, hasChanged }) => hasChanged && (option === 'restake' || valid),
  );

  // --- draft mode ----------------------------------------------------------

  const draftMode = createDraftModeBinding({ formInitiated: flowStarted, chainChanged: flowStarted });

  // A request that arrives already knowing nobody local signs it (an
  // address-book position) opens with draft mode on. Runs after the binding's
  // own `.reset(flowStarted)` regardless of registration order — the toggle
  // routes through one extra event hop, and effector resolves same-tick
  // conflicts by graph depth.
  sample({
    clock: flowStarted,
    filter: (request) => request.signingMode === 'draft',
    fn: () => true,
    target: draftMode.draftModeToggled,
  });

  // --- unknown recipient ---------------------------------------------------
  //
  // Rewards will land on this address on every payout, so an address the
  // address book does not know deserves the same acknowledgement a transfer
  // asks for. Draft mode is exempt: nothing is signed when a draft is saved,
  // and the warning fires when it is eventually signed.

  const $recipientWarning = combine(
    recipientVerificationModel.$resolveWarning,
    $destinationAccountId,
    (resolveWarning, accountId) => resolveWarning(accountId),
  );

  // A new recipient (or a fresh flow) invalidates the previous acknowledgement.
  const $isRiskAcknowledged = createStore(false)
    .on(riskAcknowledgedToggled, (_, checked) => checked)
    .reset(flowStarted, flowClosed, addressChanged, optionChanged);

  const $recipientRiskAccepted = combine(
    { warning: $recipientWarning, acknowledged: $isRiskAcknowledged, isDraftMode: draftMode.$isDraftMode },
    ({ warning, acknowledged, isDraftMode }) => isDraftMode || warning === 'none' || acknowledged,
  );

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

  // --- transaction ---------------------------------------------------------

  /**
   * The call this flow signs.
   *
   * The origin is the position's own account, not the signer: for a multisig
   * the inner call must come from the multisig, and the wrapping step then sets
   * the outer origin. `set_payee` acts on the origin's own ledger.
   */
  const $coreTx = combine(
    {
      chain: $chain,
      initiator: $initiator,
      selection: $selection,
      valid: $isAddressValid,
      isConnected: $isChainConnected,
    },
    ({ chain, initiator, selection, valid, isConnected }) => {
      if (nullable(chain) || nullable(initiator) || !isConnected) return null;
      if (selection.option === 'account' && !valid) return null;

      return transactionBuilder.buildSetPayee({
        chain,
        accountId: initiator.accountId,
        destination: toDestination(selection),
      });
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

  const {
    $errors,
    $valid: $isTxValid,
    $pending: $validating,
    $balanceValidationResults,
  } = createTxValidationStore({
    validator: payeeValidator,
    params: {
      api: $api,
      asset: $asset,
      balances: balanceModel.$balanceMap,
      route: $route,
      transaction: $tx,
    },
  });

  const $hasMultisigAccount = $route.map((route) =>
    route.some((account) => accountUtils.isAnyMultisigAccount(account)),
  );

  const $multisigDeposit = $balanceValidationResults.map((results) =>
    getActionRequiredAmount(results, MULTISIG_DEPOSIT_ACTION).reduce(
      (deposit, action) => deposit.add(action.required),
      BN_ZERO,
    ),
  );

  const $preparing = combine(
    { pendingFee: $pendingFee, pendingWrapping: $pendingWrapping, validating: $validating },
    ({ pendingFee, pendingWrapping, validating }) => pendingFee || pendingWrapping || validating,
  );

  // --- draft transaction ---------------------------------------------------

  /**
   * Draft-mode call. Its origin is pinned to the position's own account: the
   * draft executes from the path's first node, and `set_payee` acts on that
   * node's own ledger — any other source has no rights over this stash. The UI
   * pins the source picker the same way; the model refuses a mismatch
   * regardless, so a stale or hand-built path cannot produce a call for the
   * wrong stash.
   */
  const $draftCoreTx = combine(
    {
      chain: $chain,
      position: $position,
      selection: $selection,
      valid: $isAddressValid,
      path: draftMode.$draftSigningPath,
      isPathComplete: draftMode.$isDraftPathComplete,
    },
    ({ chain, position, selection, valid, path, isPathComplete }) => {
      if (nullable(chain) || nullable(position) || !isPathComplete) return null;
      if (selection.option === 'account' && !valid) return null;

      const source = path[0]?.accountId;
      if (nullable(source) || source !== position.accountId) return null;

      return transactionBuilder.buildSetPayee({
        chain,
        accountId: position.accountId,
        destination: toDestination(selection),
      });
    },
  );

  const $draftCallDataHex = combine($draftCoreTx, $api, (tx, api) => transactionService.getCallDataHex(tx, api));

  const $canSaveAsDraft = combine(
    {
      isDraftMode: draftMode.$isDraftMode,
      isPathComplete: draftMode.$isDraftPathComplete,
      callData: $draftCallDataHex,
      network: $networkStore,
      selectionValid: $isSelectionValid,
    },
    ({ isDraftMode, isPathComplete, callData, network, selectionValid }) =>
      isDraftMode && isPathComplete && nonNullable(callData) && nonNullable(network) && selectionValid,
  );

  draftMode.connectSave({
    source: 'staking-payee-flow-draft-mode',
    $callDataHex: $draftCallDataHex,
    $networkStore,
    $canSave: $canSaveAsDraft,
  });

  // A draft is created *instead of* signing, never alongside it: once the draft
  // lands the flow is over and the modal closes.
  wireDraftCloseRedirect({ $initiatedDraft: draftMode.$initiatedDraft, flowFinished: flowClosed });

  // --- gates ---------------------------------------------------------------

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

  /**
   * `Continue` gate — form → confirm. The recipient acknowledgement is not part
   * of it: the box lives on the confirm, so the form must let the user reach
   * it. Draft mode never reaches the confirm; it has its own button and gate.
   */
  const $canContinue = combine(
    {
      isDraftMode: draftMode.$isDraftMode,
      selectionValid: $isSelectionValid,
      txValid: $isTxValid,
      preparing: $preparing,
      tx: $tx,
      noRouteSigner: $noRouteSigner,
    },
    ({ isDraftMode, selectionValid, txValid, preparing, tx, noRouteSigner }) =>
      !isDraftMode && selectionValid && txValid && !preparing && nonNullable(tx) && !noRouteSigner,
  );

  /** `Sign` gate — everything `Continue` needs, plus the acknowledgement. */
  const $canSign = combine($canContinue, $recipientRiskAccepted, (canContinue, accepted) => canContinue && accepted);

  sample({
    clock: continueRequested,
    source: $canContinue,
    filter: (canContinue) => canContinue,
    fn: () => Step.CONFIRM,
    target: stepChanged,
  });

  // --- basket ---------------------------------------------------------------
  //
  // The basket signs the stored core call directly by its initiator (no
  // wrapping in the basket context), so it is only offered when the initiator's
  // own wallet is one the basket can sign with. Draft mode is mutually
  // exclusive by nature.

  const $canUseBasket = combine(
    { wallet: $wallet, isDraftMode: draftMode.$isDraftMode, coreTx: $coreTx, selectionValid: $isSelectionValid },
    ({ wallet, isDraftMode, coreTx, selectionValid }) =>
      !isDraftMode &&
      nonNullable(wallet) &&
      basketUtils.isBasketAvailable(wallet) &&
      nonNullable(coreTx) &&
      selectionValid,
  );

  const basketSaved = sample({
    clock: txSaved,
    source: { canUseBasket: $canUseBasket, coreTx: $coreTx, route: $route },
    filter: (source): source is typeof source & { coreTx: Transaction } =>
      source.canUseBasket && nonNullable(source.coreTx),
  });

  sample({
    clock: basketSaved,
    fn: ({ coreTx, route }) => [
      {
        initiatorAccountId: coreTx.accountId,
        coreTx,
        route,
        createdAt: Date.now(),
      },
    ],
    target: basketOperations.addTransactions,
  });

  sample({
    clock: basketSaved,
    fn: () => Step.BASKET,
    target: stepChanged,
  });

  // --- confirm → sign → submit --------------------------------------------

  const $confirmDraft = combine(
    {
      request: $request,
      signatory: $signatory,
      route: $route,
      tx: $tx,
      coreTx: $coreTx,
      selection: $selection,
    },
    ({ request, signatory, route, tx, coreTx, selection }): PayeeFlowConfirm | null => {
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
        destination: toDestination(selection),
      };
    },
  );

  const confirmReady = sample({
    clock: [stepChanged, $tx],
    source: { draft: $confirmDraft, step: $step },
    filter: (source): source is typeof source & { draft: PayeeFlowConfirm } =>
      nonNullable(source.draft) && source.step === Step.CONFIRM,
  });

  sample({
    clock: confirmReady,
    fn: ({ draft }) => [draft],
    target: confirmModel.init,
  });

  // The button is disabled while `$canSign` is false, and the model refuses
  // too: the acknowledgement must not be bypassable by a stale click.
  sample({
    clock: confirmModel.startSigning,
    source: $canSign,
    filter: (canSign) => canSign,
    fn: () => Step.SIGN,
    target: stepChanged,
  });

  const sign = sample({
    clock: confirmModel.startSigning,
    source: { confirms: confirmModel.$confirms, canSign: $canSign },
    filter: ({ canSign }) => canSign,
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
  // Only a flow standing *at* the sign step may claim the signature.
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
    $chain,
    $asset,
    $position,
    $initiator,
    $wallet,
    $signatory,
    $route,
    $signingPath,

    $option: readonly($option),
    $address: readonly($address),
    $selection,
    $destinationAccountId,
    $isAddressValid,
    $hasChanged,
    $isSelectionValid,

    $recipientWarning,
    $isRiskAcknowledged: readonly($isRiskAcknowledged),
    $recipientRiskAccepted,

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
    $canContinue,
    $canSign,
    $canUseBasket,
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

    changeRewardDestinationRequested,
    flowStarted,
    flowClosed,
    flowCompleted,
    stepChanged,
    optionChanged,
    addressChanged,
    riskAcknowledgedToggled,
    continueRequested,
    txSaved,
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
export const payeeFlowModel = createPayeeFlowModel();

export const payeeFlowUtils = {
  isNoneStep: (step: Step) => step === Step.NONE,
  isInitStep: (step: Step) => step === Step.INIT,
  isConfirmStep: (step: Step) => step === Step.CONFIRM,
  isSignStep: (step: Step) => step === Step.SIGN,
  isSubmitStep: (step: Step) => step === Step.SUBMIT,
  isBasketStep: (step: Step) => step === Step.BASKET,
};
