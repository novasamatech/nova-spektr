import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type ChainId, type Validator, RewardsDestination } from '@/shared/core';
import {
  ZERO_BALANCE,
  formatAmount,
  fromPrecision,
  getRelaychainAsset,
  nonNullable,
  nullable,
  reservableAmountBN,
  toAddress,
  validateAddress,
} from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createRouteSignerStore,
  createTxValidationStore,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { DEFAULT_STAKING_CHAIN, validatorsService } from '@/domains/staking';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { stakingPositions } from '@/aggregates/staking-positions';
import { walletSelect } from '@/aggregates/wallet-select';
import { createDraftModeBinding, wireDraftCloseRedirect } from '@/features/drafts';
import { signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { bondNominateValidator } from '@/features/operations/OperationsValidation';
import { createSigningPathModel } from '@/features/signing-path';
import { getSigningMode, validatorSelectionModel } from '@/features/validator-selection';
import { getAvailableToBond, isBelowMinimumBond } from '../lib/amount-rules';
import { type NewPositionConfirm, Step } from '../types';

import { confirmModel } from './confirm';

/**
 * Falls back when the api cannot answer. Only ever used to pad the fee probe
 * below, never to cap a real selection — the picker asks the chain itself.
 */
const FALLBACK_MAX_NOMINATIONS = 16;

/**
 * Bond + nominate, assembled on the dashboard.
 *
 * The one staking operation that used to hand the user off to the Staking page.
 * It differs from its two siblings in having no position to start from: there
 * is no chain, no account and no stake until this flow asks for them, which is
 * why it owns a chain and an account field that `staking-amount-flow` does not
 * need.
 */
export const createNewPositionFlowModel = () => {
  // --- entry points --------------------------------------------------------

  const newPositionRequested = createEvent();
  const flowClosed = createEvent();
  /** A landed extrinsic. The host refreshes what it shows off this. */
  const flowCompleted = createEvent();

  const stepChanged = createEvent<Step>();
  const chainChanged = createEvent<ChainId>();
  const initiatorChanged = createEvent<AnyAccount>();
  const amountChanged = createEvent<string>();
  const maxAmountRequested = createEvent();
  const destinationTypeChanged = createEvent<RewardsDestination>();
  const destinationChanged = createEvent<string>();
  const continueRequested = createEvent();
  const validatorsCancelled = createEvent();

  const $step = createStore(Step.NONE).on(stepChanged, (_, step) => step);

  sample({
    clock: newPositionRequested,
    fn: () => Step.INIT,
    target: stepChanged,
  });

  // --- chain ---------------------------------------------------------------
  //
  // The dashboard has no selected network — unlike the Staking page, which the
  // old flow inherited one from. So the flow asks, defaulting to the app's
  // default staking chain and falling back to whatever the running config
  // actually has (Westend only exists in dev).

  const $stakingChains = stakingPositions.$stakingChains;

  const $chainId = createStore<ChainId>(DEFAULT_STAKING_CHAIN)
    .on(chainChanged, (_, chainId) => chainId)
    .reset(flowClosed);

  const $chain = combine($stakingChains, $chainId, (chains, chainId) => {
    return chains.find((chain) => chain.chainId === chainId) ?? chains.at(0) ?? null;
  });

  const $asset = $chain.map((chain) => (chain ? (getRelaychainAsset(chain.assets) ?? null) : null));

  const $networkStore = combine($chain, $asset, (chain, asset) => (chain && asset ? { chain, asset } : null));

  const $api = combine(networkModel.$apis, $chain, (apis, chain) => (chain ? (apis[chain.chainId] ?? null) : null));

  // --- account -------------------------------------------------------------

  const $availableAccounts = combine({ list: walletModel.$availableAccounts, chain: $chain }, ({ list, chain }) =>
    chain ? list.filter((account) => accountService.isAccountAvailableOnChain(account, chain)) : [],
  );

  const $initiator = createStore<AnyAccount | null>(null)
    .on(initiatorChanged, (_, account) => account)
    .reset(flowClosed);

  /**
   * Keeps a usable account in the field at all times.
   *
   * "Stake from" is chosen inside the signing path, and the path is computed
   * _from_ an initiator — with none there is no path to render and nothing to
   * click. So one is always seeded: an account of the selected wallet when the
   * chain can hold one, otherwise the first candidate. The user changes it by
   * editing the source card, not through a separate dropdown.
   *
   * Switching chain can also strip the current account of its key scheme or its
   * own binding, and a stale initiator would silently build a transaction for
   * an account that cannot hold it.
   */
  sample({
    clock: $availableAccounts,
    source: { initiator: $initiator, selectedWallet: walletSelect.$selectedWallet },
    fn: ({ initiator, selectedWallet }, available) => {
      const stillAvailable = initiator && available.some((account) => account.id === initiator.id);
      if (stillAvailable) return initiator;

      const ownAccount = selectedWallet
        ? available.find((account) => account.walletId === selectedWallet.id)
        : undefined;

      return ownAccount ?? available[0] ?? null;
    },
    target: $initiator,
  });

  const $wallet = combine({ initiator: $initiator, wallets: walletModel.$wallets }, ({ initiator, wallets }) =>
    initiator ? (wallets.find((wallet) => wallet.id === initiator.walletId) ?? null) : null,
  );

  // --- form ----------------------------------------------------------------

  const $amount = createStore('')
    .on(amountChanged, (_, amount) => amount)
    .reset(newPositionRequested, flowClosed, chainChanged);

  const $destinationType = createStore<RewardsDestination>(RewardsDestination.RESTAKE)
    .on(destinationTypeChanged, (_, type) => type)
    .reset(newPositionRequested, flowClosed);

  const $destination = createStore('')
    .on(destinationChanged, (_, address) => address)
    .reset(newPositionRequested, flowClosed, destinationTypeChanged);

  const $isDestinationValid = combine(
    { type: $destinationType, destination: $destination },
    ({ type, destination }) => type === RewardsDestination.RESTAKE || validateAddress(destination),
  );

  const $validators = createStore<Validator[]>([]).reset(newPositionRequested, flowClosed, chainChanged);

  // --- signing route -------------------------------------------------------

  const { $signingPath, signingPathChanged, $signatoryFromPath, $pathRoute } = createSigningPathModel({
    initiator: $initiator,
    chain: $chain,
    resetOn: [newPositionRequested, flowClosed],
    resetUserOverrideOn: [chainChanged, initiatorChanged],
  });

  /**
   * The source card _is_ the "Stake from" field, so editing it moves the
   * account being staked from.
   *
   * No loop with the seeding above: the path model marks a hand-picked path as
   * a user override and stops recomputing defaults for it, so following the
   * source here cannot bounce back into a fresh default path.
   */
  sample({
    clock: signingPathChanged,
    source: $availableAccounts,
    filter: (available, path) => {
      const source = path.at(0);

      return nonNullable(source) && available.some((account) => account.accountId === source.accountId);
    },
    fn: (available, path) => available.find((account) => account.accountId === path[0]?.accountId) ?? null,
    target: $initiator,
  });

  /**
   * A regular account signs for itself, and for one the signing path is empty
   * by design — falling back to the initiator is what keeps the wrapping step
   * from refusing the transaction and stranding the confirm on a fee that never
   * arrives. Same reasoning as `staking-amount-flow`.
   */
  const $routeSignatory = combine($signatoryFromPath, $initiator, (fromPath, initiator) => fromPath ?? initiator);

  // --- balances and limits -------------------------------------------------

  const $initiatorBalance = combine(
    { initiator: $initiator, chain: $chain, asset: $asset, balances: balanceModel.$balanceMap },
    ({ initiator, chain, asset, balances }) => {
      if (!initiator || !chain || !asset) return null;

      return balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);
    },
  );

  const $reservable = $initiatorBalance.map((balance) => (balance ? reservableAmountBN(balance) : BN_ZERO));

  /**
   * Keyed by the _resolved_ chain, never by `$chainId`.
   *
   * The requested id can point at a network this config does not have, in which
   * case `$chain` falls back to the first staking chain — and a minimum read
   * under the requested id would then silently be zero, letting a bond through
   * that `staking.nominate` will reject.
   */
  const $minimumBond = combine(stakingPositions.$minNominatorBond, $chain, (byChain, chain) => {
    return new BN((chain ? byChain[chain.chainId] : null) ?? ZERO_BALANCE);
  });

  const $maxNominations = $api.map((api) =>
    nonNullable(api) ? validatorsService.getMaxValidators(api) : FALLBACK_MAX_NOMINATIONS,
  );

  const $amountPlanck = combine($amount, $asset, (amount, asset) => {
    if (!asset || !amount) return BN_ZERO;

    return new BN(formatAmount(amount, asset.precision));
  });

  // --- transaction ---------------------------------------------------------

  const $rewardDestination = combine({ type: $destinationType, destination: $destination }, ({ type, destination }) =>
    type === RewardsDestination.RESTAKE ? ('Staked' as const) : { destination: toAddress(destination) },
  );

  /**
   * The real call, built only once the validators are known.
   *
   * Until then it is `null` and the fee falls through to the probe below —
   * `createComplexTxStore` prices `tx || feeTx`, which is what lets the amount
   * step show a fee before the picker has been opened.
   *
   * The origin is the account being staked from, never the signer: for a
   * multisig the inner call must come from the multisig, and the wrapping step
   * sets the outer origin.
   */
  const $coreTx = combine(
    {
      chain: $chain,
      asset: $asset,
      initiator: $initiator,
      amount: $amount,
      destination: $rewardDestination,
      isDestinationValid: $isDestinationValid,
      validators: $validators,
    },
    ({ chain, asset, initiator, amount, destination, isDestinationValid, validators }) => {
      if (!chain || !asset || !initiator || !amount || !isDestinationValid || validators.length === 0) return null;

      return transactionBuilder.buildBondNominate({
        chain,
        asset,
        accountId: initiator.accountId,
        amount,
        destination,
        nominators: validators.map(({ accountId }) => accountId),
      });
    },
  );

  /**
   * Fee probe for the amount step.
   *
   * `Max` is "everything reservable minus the fee", and the fee depends on the
   * amount and on how many validators the nomination carries — neither of which
   * is settled while the user is typing. Pricing the largest call the flow
   * could end up sending (a full nomination slate, the whole reservable
   * balance) gives a stable upper bound, so `Max` errs towards leaving a little
   * behind rather than towards a confirm that cannot pay its own fee.
   */
  const $feeTx = combine(
    {
      chain: $chain,
      asset: $asset,
      initiator: $initiator,
      reservable: $reservable,
      destination: $rewardDestination,
      maxNominations: $maxNominations,
    },
    ({ chain, asset, initiator, reservable, destination, maxNominations }) => {
      if (!chain || !asset || !initiator || reservable.isZero()) return null;

      return transactionBuilder.buildBondNominate({
        chain,
        asset,
        accountId: initiator.accountId,
        amount: fromPrecision(reservable, asset.precision),
        destination,
        nominators: Array.from({ length: maxNominations }, () => initiator.accountId),
      });
    },
  );

  const { $route, $tx, $fee, $pendingFee, $pendingWrapping } = createComplexTxStore({
    api: $api,
    chain: $chain,
    transaction: $coreTx,
    feeTransaction: $feeTx,
    accounts: accounts.$list,
    initiator: $initiator,
    signatory: $routeSignatory,
    routeOverride: $pathRoute,
  });

  /** Display/draft terminal hop; `$routeSigner` is the permission-checked one. */
  const $signatory = combine($route, $initiator, (route, initiator) => route.at(-1) ?? initiator);

  const $available = combine($reservable, $fee, (reservable, fee) => getAvailableToBond({ reservable, fee }));

  sample({
    clock: maxAmountRequested,
    source: { available: $available, asset: $asset },
    filter: ({ asset }) => nonNullable(asset),
    fn: ({ available, asset }) => fromPrecision(available, asset!.precision),
    target: amountChanged,
  });

  const $isBelowMinimumBond = combine({ amount: $amountPlanck, minimumBond: $minimumBond }, isBelowMinimumBond);

  // --- validation ----------------------------------------------------------

  const {
    $errors,
    $valid: $isTxValid,
    $pending: $validating,
    $balanceValidationResults,
  } = createTxValidationStore({
    validator: bondNominateValidator,
    params: {
      api: $api,
      chain: $chain,
      asset: $asset,
      balances: balanceModel.$balanceMap,
      route: $route,
      transaction: $tx,
      amount: $amount,
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
    { pendingFee: $pendingFee, pendingWrapping: $pendingWrapping, validating: $validating },
    ({ pendingFee, pendingWrapping, validating }) => pendingFee || pendingWrapping || validating,
  );

  /**
   * What the amount step can decide on its own, before the node is consulted.
   *
   * The minimum bond blocks rather than warns: `staking.nominate` rejects a
   * stash bonded under it, and the two calls travel as one `BATCH_ALL`.
   */
  const $isAmountValid = combine(
    { amount: $amountPlanck, available: $available, belowMinimum: $isBelowMinimumBond },
    ({ amount, available, belowMinimum }) => !amount.isZero() && !amount.gt(available) && !belowMinimum,
  );

  // --- draft mode ----------------------------------------------------------

  const draftMode = createDraftModeBinding({ formInitiated: newPositionRequested, chainChanged });

  /**
   * Draft-mode transaction, built from the path's own source rather than from
   * the connected wallet — the whole point of a draft is that nobody here can
   * sign it.
   */
  const $draftCoreTx = combine(
    {
      chain: $chain,
      asset: $asset,
      amount: $amount,
      destination: $rewardDestination,
      isDestinationValid: $isDestinationValid,
      validators: $validators,
      path: draftMode.$draftSigningPath,
      isPathComplete: draftMode.$isDraftPathComplete,
    },
    ({ chain, asset, amount, destination, isDestinationValid, validators, path, isPathComplete }) => {
      if (!chain || !asset || !amount || !isPathComplete || !isDestinationValid || validators.length === 0) return null;

      const accountId = path[0]?.accountId;
      if (!accountId) return null;

      return transactionBuilder.buildBondNominate({
        chain,
        asset,
        accountId,
        amount,
        destination,
        nominators: validators.map((validator) => validator.accountId),
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
      amount: $amountPlanck,
    },
    ({ isDraftMode, isPathComplete, callData, network, amount }) =>
      isDraftMode && isPathComplete && nonNullable(callData) && nonNullable(network) && !amount.isZero(),
  );

  draftMode.connectSave({
    source: 'staking-new-position-flow-draft-mode',
    $callDataHex: $draftCallDataHex,
    $networkStore,
    $canSave: $canSaveAsDraft,
  });

  wireDraftCloseRedirect({ $initiatedDraft: draftMode.$initiatedDraft, flowFinished: flowClosed });

  // --- amount step → validators --------------------------------------------
  //
  // The node has nothing to say yet: the transaction it would validate does not
  // exist until a validator set does. What can be decided here is decided here,
  // and the tx-level rules gate the confirm instead.

  const $routeSigner = createRouteSignerStore($route);

  /**
   * No one on the resolved route can actually sign: the picked account is
   * watch-only. Blocks the gate and surfaces an explicit message instead of a
   * silently dead button. No initiator picked yet is not this error —
   * `$canContinue` demands one on its own.
   */
  const $noRouteSigner = combine(
    { isDraftMode: draftMode.$isDraftMode, initiator: $initiator, routeSigner: $routeSigner },
    ({ isDraftMode, initiator, routeSigner }) => !isDraftMode && nonNullable(initiator) && nullable(routeSigner),
  );

  const $canContinue = combine(
    {
      isDraftMode: draftMode.$isDraftMode,
      amountValid: $isAmountValid,
      destinationValid: $isDestinationValid,
      initiator: $initiator,
      preparing: $preparing,
      noRouteSigner: $noRouteSigner,
    },
    ({ isDraftMode, amountValid, destinationValid, initiator, preparing, noRouteSigner }) =>
      !isDraftMode && amountValid && destinationValid && nonNullable(initiator) && !preparing && !noRouteSigner,
  );

  const validatorsStepEntered = sample({
    clock: continueRequested,
    source: { canContinue: $canContinue, chain: $chain, asset: $asset, initiator: $initiator, wallet: $wallet },
    filter: ({ canContinue, chain, asset }) => canContinue && nonNullable(chain) && nonNullable(asset),
  });

  sample({
    clock: validatorsStepEntered,
    fn: () => Step.VALIDATORS,
    target: stepChanged,
  });

  /**
   * The picker is a singleton shared with the Staking page's own flows, so it
   * is opened with this flow's chain and account explicitly — otherwise it
   * would still be scoped to whatever opened it last.
   */
  sample({
    clock: validatorsStepEntered,
    source: draftMode.$isDraftMode,
    fn: (isDraftMode, { chain, asset, initiator, wallet }) => ({
      chain: chain!,
      asset: asset!,
      signingMode: getSigningMode({ isDraftMode, wallet }),
      initiator: initiator ?? undefined,
      initiatorWallet: wallet ?? undefined,
    }),
    target: validatorSelectionModel.events.formInitiated,
  });

  /**
   * `formSubmitted` is global — the Staking page's bond-nominate and nominate
   * flows submit through the very same event. Only a flow standing _at_ the
   * validators step may claim a selection as its own.
   */
  const validatorsSubmitted = sample({
    clock: validatorSelectionModel.output.formSubmitted,
    source: $step,
    filter: (step) => step === Step.VALIDATORS,
    fn: (_, validators) => validators,
  });

  sample({ clock: validatorsSubmitted, target: $validators });

  sample({
    clock: validatorsSubmitted,
    fn: () => Step.CONFIRM,
    target: stepChanged,
  });

  sample({
    clock: validatorsCancelled,
    fn: () => Step.INIT,
    target: stepChanged,
  });

  // Clearing the picker is tied to leaving it, never to submitting: the Staking
  // page's flows keep it alive across their own Back, and clearing on every
  // submit wiped their chain and selection out from under them. See
  // `dashboard-staking-positions/model/position-actions.ts`.
  sample({
    clock: [validatorsCancelled, flowClosed],
    target: validatorSelectionModel.events.formCleared,
  });

  // --- confirm → sign → submit --------------------------------------------

  const $confirmDraft = combine(
    {
      chain: $chain,
      initiator: $initiator,
      signatory: $signatory,
      route: $route,
      tx: $tx,
      coreTx: $coreTx,
      amount: $amountPlanck,
      destinationType: $destinationType,
      destination: $destination,
      validators: $validators,
    },
    ({
      chain,
      initiator,
      signatory,
      route,
      tx,
      coreTx,
      amount,
      destinationType,
      destination,
      validators,
    }): NewPositionConfirm | null => {
      if (!chain || !initiator || !signatory || !tx || !coreTx) return null;

      return {
        chain,
        initiator,
        signatory,
        route: route.length > 0 ? route : [initiator],
        tx,
        coreTx,
        amount: amount.toString(),
        destinationType,
        payoutAddress: destinationType === RewardsDestination.RESTAKE ? null : toAddress(destination),
        validators,
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
    fn: () => Step.SIGN,
    target: stepChanged,
  });

  const sign = sample({
    clock: confirmModel.startSigning,
    source: confirmModel.$confirms,
    fn: (confirms) => ({
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
    $stakingChains,
    $chainId: readonly($chainId),
    $chain,
    $asset,
    $availableAccounts,
    $initiator: readonly($initiator),
    $wallet,
    $signatory,
    $route,
    $signingPath,

    $amount: readonly($amount),
    $amountPlanck,
    $available,
    $reservable,
    $minimumBond,
    $isBelowMinimumBond,
    $destinationType: readonly($destinationType),
    $destination: readonly($destination),
    $isDestinationValid,
    $validators: readonly($validators),
    $maxNominations,

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
    /** Node-side verdict on the built call. Gates the confirm, not the form. */
    $isTxValid,
    $confirms: confirmModel.$confirms,

    $isDraftMode: draftMode.$isDraftMode,
    $initiatedDraft: draftMode.$initiatedDraft,
    $isDraftPathComplete: draftMode.$isDraftPathComplete,
    $draftSigningPath: draftMode.$draftSigningPath,
    $canSaveAsDraft,

    newPositionRequested,
    flowClosed,
    flowCompleted,
    stepChanged,
    chainChanged,
    initiatorChanged,
    amountChanged,
    maxAmountRequested,
    destinationTypeChanged,
    destinationChanged,
    continueRequested,
    validatorsCancelled,
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
 * `validatorSelectionModel`, `createDraftModel`), so a second instance would
 * double-wire them. Tests fork this one instead of building their own.
 */
export const newPositionFlowModel = createNewPositionFlowModel();

export const newPositionFlowUtils = {
  isNoneStep: (step: Step) => step === Step.NONE,
  isInitStep: (step: Step) => step === Step.INIT,
  isValidatorsStep: (step: Step) => step === Step.VALIDATORS,
  isConfirmStep: (step: Step) => step === Step.CONFIRM,
  isSignStep: (step: Step) => step === Step.SIGN,
  isSubmitStep: (step: Step) => step === Step.SUBMIT,
};
