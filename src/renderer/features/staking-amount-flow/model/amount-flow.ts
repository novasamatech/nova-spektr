import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import {
  ZERO_BALANCE,
  formatAmount,
  fromPrecision,
  nonNullable,
  nullable,
  reservableAmountBN,
} from '@/shared/lib/utils';
import { stakingPallet } from '@/shared/pallet/staking';
import {
  MULTISIG_DEPOSIT_ACTION,
  createComplexTxStore,
  createRouteSignerStore,
  createTxValidationStore,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { accounts } from '@/domains/network';
import { era } from '@/domains/staking';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { basketUtils } from '@/entities/basket';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { stakingPositions } from '@/aggregates/staking-positions';
import { balanceSubModel } from '@/features/assets-balances';
import { createDraftModeBinding, wireDraftCloseRedirect, wireDraftSourceBalance } from '@/features/drafts';
import { signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { bondExtraValidator, unstakeValidator } from '@/features/operations/OperationsValidation';
import { createSigningPathModel } from '@/features/signing-path';
import {
  getMaxAmount,
  getRemainingStake,
  hasReachedUnlockingLimit,
  isBelowMinimumBond,
  isFullUnbond,
  shouldChill,
} from '../lib/amount-rules';
import { type AmountFlowConfirm, type AmountFlowRequest, type AmountFlowTarget, Step } from '../types';

import { confirmModel } from './confirm';

/**
 * Unbond and Add stake, as one flow.
 *
 * The approved design gives Unbond a screen (frame F7) and Add stake none,
 * because the two are the same screen: one position, one amount, one signing
 * route. Forking them would mean maintaining two copies of the signing plumbing
 * so that one of them could hide a callout. Instead the mode is a parameter —
 * it decides which figure caps the amount, which call is built and what the
 * callouts say, and nothing else.
 */
export const createAmountFlowModel = () => {
  // --- entry points --------------------------------------------------------

  const unbondRequested = createEvent<AmountFlowTarget>();
  const addStakeRequested = createEvent<AmountFlowTarget>();
  const flowStarted = createEvent<AmountFlowRequest>();
  const flowClosed = createEvent();
  /** A landed extrinsic. The host refreshes what it shows off this. */
  const flowCompleted = createEvent();

  const stepChanged = createEvent<Step>();
  const amountChanged = createEvent<string>();
  const maxAmountRequested = createEvent();
  const continueRequested = createEvent();
  const txSaved = createEvent();

  sample({
    clock: unbondRequested,
    fn: (target): AmountFlowRequest => ({ ...target, mode: 'unbond' }),
    target: flowStarted,
  });

  sample({
    clock: addStakeRequested,
    fn: (target): AmountFlowRequest => ({ ...target, mode: 'addStake' }),
    target: flowStarted,
  });

  const $step = createStore(Step.NONE).on(stepChanged, (_, step) => step);

  /**
   * The position the user pressed on, snapshotted.
   *
   * The live position keeps moving with every era and every block; the one
   * being signed must not — a re-elected validator must not change the figure
   * under a half-typed amount.
   */
  const $request = createStore<AmountFlowRequest | null>(null)
    .on(flowStarted, (_, request) => request)
    .reset(flowClosed);

  sample({
    clock: flowStarted,
    fn: () => Step.INIT,
    target: stepChanged,
  });

  const $mode = $request.map((request) => request?.mode ?? null);
  const $chain = $request.map((request) => request?.chain ?? null);
  const $asset = $request.map((request) => request?.asset ?? null);
  const $position = $request.map((request) => request?.position ?? null);
  const $initiator = $request.map((request) => request?.account ?? null);
  const $wallet = $request.map((request) => request?.wallet ?? null);

  /** Shape `createDraftModeBinding` and the draft save expect. */
  const $networkStore = combine($chain, $asset, (chain, asset) => (chain && asset ? { chain, asset } : null));

  const $api = combine(networkModel.$apis, $chain, (apis, chain) => (chain ? (apis[chain.chainId] ?? null) : null));

  /**
   * No connection → no `$coreTx` → no fee and nothing to sign. The same guard
   * the old staking forms carry: a flow opened on a disconnected chain would
   * otherwise build a call against a stale or absent api. The draft path stays
   * ungated on purpose — a draft is call data for somebody else to sign later,
   * and building it needs no live connection.
   */
  const $isChainConnected = combine(networkModel.$connectionStatuses, $chain, (statuses, chain) => {
    if (!chain) return false;

    const status = statuses[chain.chainId];
    if (!status) return false;

    return networkUtils.isConnectedStatus(status);
  });

  // --- amount --------------------------------------------------------------

  const $amount = createStore('')
    .on(amountChanged, (_, amount) => amount)
    .reset(flowStarted, flowClosed);

  const $activeStake = $position.map((position) => new BN(position?.stake.active ?? ZERO_BALANCE));

  const $initiatorBalance = combine(
    { initiator: $initiator, chain: $chain, asset: $asset, balances: balanceModel.$balanceMap },
    ({ initiator, chain, asset, balances }) => {
      if (!initiator || !chain || !asset) return null;

      return balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);
    },
  );

  // Created ahead of its own section below: in draft mode the available
  // balance must read the path's source, not the initiator, so the binding has
  // to exist before the balance derivations.
  const draftMode = createDraftModeBinding({ formInitiated: flowStarted, chainChanged: flowStarted });

  // Source balance for draft mode: fetched on-demand once the path is set so
  // "Available"/Max reflect the eventual signer's balance, not the connected
  // wallet's initiator (or zero for a contact position).
  const $draftSourceBalance = wireDraftSourceBalance({
    $draftPath: draftMode.$draftSigningPath,
    $chain: $chain,
    $isDraftMode: draftMode.$isDraftMode,
    // The staking asset, explicitly — not the wire's native-asset default.
    $asset: $asset,
  });

  const $reservable = combine(
    {
      isDraftMode: draftMode.$isDraftMode,
      draftSourceBalance: $draftSourceBalance,
      initiatorBalance: $initiatorBalance,
    },
    ({ isDraftMode, draftSourceBalance, initiatorBalance }) => {
      if (isDraftMode) return draftSourceBalance ? reservableAmountBN(draftSourceBalance) : BN_ZERO;

      return initiatorBalance ? reservableAmountBN(initiatorBalance) : BN_ZERO;
    },
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
   * arrives. See `vesting-claim` for the full account of that failure.
   */
  const $routeSignatory = combine($signatoryFromPath, $initiator, (fromPath, initiator) => fromPath ?? initiator);

  /**
   * A direct signer has no route to draw — `SigningPathSection` renders nothing
   * below two nodes — so the amount screen shows the bare account instead.
   */
  const $isDirectSigner = $signingPath.map((path) => path.length < 2);

  // --- chain constants -----------------------------------------------------

  type ChainConsts = { bondingDuration: number; maxUnlockingChunks: number | null };

  const readChainConstsFx = createEffect((api: ApiPromise): ChainConsts => {
    let maxUnlockingChunks: number | null = null;
    try {
      maxUnlockingChunks = stakingPallet.consts.maxUnlockingChunks(api);
    } catch {
      // Absent on some runtimes — the guard simply doesn't apply there.
    }

    return { bondingDuration: stakingPallet.consts.bondingDuration(api), maxUnlockingChunks };
  });

  const $chainConsts = createStore<ChainConsts | null>(null)
    .on(readChainConstsFx.doneData, (_, consts) => consts)
    .reset(flowStarted, flowClosed);

  // Clocked on the stores rather than on `flowStarted`, so the read happens once
  // the api for the freshly-set chain is actually resolvable.
  sample({
    clock: [$request, networkModel.$apis],
    source: { request: $request, api: $api },
    filter: ({ request, api }) => nonNullable(request) && nonNullable(api),
    fn: ({ api }) => api!,
    target: readChainConstsFx,
  });

  const $bondingDuration = $chainConsts.map((consts) => consts?.bondingDuration ?? null);
  const $maxUnlockingChunks = $chainConsts.map((consts) => consts?.maxUnlockingChunks ?? null);

  /**
   * Chain minimum active bond, read from the staking-positions aggregate — the
   * dashboard already holds it, so opening the modal starts no new request.
   */
  const $minimumBond = combine(stakingPositions.$minNominatorBond, $chain, (minBonds, chain) =>
    chain ? new BN(minBonds[chain.chainId] ?? ZERO_BALANCE) : BN_ZERO,
  );

  /**
   * Era anchor of the position's chain, owned by the staking-positions
   * aggregate. `null` on a chain that cannot say when its era started — the
   * callout then names the era count and no date.
   */
  const $eraAnchor = combine(era.eraProgressResource.$cache, $chain, (cache, chain) => {
    if (!chain) return null;
    const progress = cache[chain.chainId];

    return progress ? { eraStartMs: progress.eraStartMs, eraDurationMs: progress.eraDurationMs } : null;
  });

  // --- derived amounts -----------------------------------------------------

  const $amountPlanck = combine($amount, $asset, (amount, asset) => {
    if (!asset || !amount) return BN_ZERO;

    return new BN(formatAmount(amount, asset.precision));
  });

  const $remainingStake = combine($activeStake, $amountPlanck, (activeStake, amount) =>
    getRemainingStake({ activeStake, amount }),
  );

  const $isFullUnbond = combine($activeStake, $amountPlanck, (activeStake, amount) =>
    isFullUnbond({ activeStake, amount }),
  );

  const $withChill = combine(
    { mode: $mode, activeStake: $activeStake, amount: $amountPlanck, minimumBond: $minimumBond },
    ({ mode, activeStake, amount, minimumBond }) =>
      mode === 'unbond' && shouldChill({ activeStake, amount, minimumBond }),
  );

  /** The amber callout of frame F7. Never blocks `Continue`. */
  const $isBelowMinimumBond = combine(
    { mode: $mode, activeStake: $activeStake, amount: $amountPlanck, minimumBond: $minimumBond },
    ({ mode, activeStake, amount, minimumBond }) =>
      mode === 'unbond' && isBelowMinimumBond({ activeStake, amount, minimumBond }),
  );

  const $unlockingLimitReached = combine(
    { mode: $mode, position: $position, maxUnlockingChunks: $maxUnlockingChunks },
    ({ mode, position, maxUnlockingChunks }) =>
      mode === 'unbond' &&
      hasReachedUnlockingLimit({ chunkCount: position?.unbonding.length ?? 0, maxUnlockingChunks }),
  );

  // --- transaction ---------------------------------------------------------

  const $coreTx = combine(
    {
      mode: $mode,
      chain: $chain,
      asset: $asset,
      initiator: $initiator,
      amount: $amount,
      withChill: $withChill,
      isConnected: $isChainConnected,
    },
    ({ mode, chain, asset, initiator, amount, withChill, isConnected }) => {
      if (!mode || !chain || !asset || !initiator || !amount || !isConnected) return null;

      if (mode === 'addStake') {
        return transactionBuilder.buildBondExtra({ chain, asset, accountId: initiator.accountId, amount });
      }

      // The origin is the position's own account, not the signer: for a multisig
      // the inner call must come from the multisig, and the wrapping step then
      // sets the outer origin.
      return transactionBuilder.buildUnstake({
        chain,
        asset,
        accountId: initiator.accountId,
        amount,
        withChill,
      });
    },
  );

  /**
   * Fee probe for Add stake only.
   *
   * `Max` there is "everything reservable minus the fee", and the fee depends
   * on the amount — so pricing the real call would chase its own tail. Pricing
   * the largest possible call instead gives a stable figure (the encoded length
   * of a balance barely moves the weight).
   */
  const $feeTx = combine(
    { mode: $mode, chain: $chain, asset: $asset, initiator: $initiator, reservable: $reservable },
    ({ mode, chain, asset, initiator, reservable }) => {
      if (mode !== 'addStake' || !chain || !asset || !initiator || reservable.isZero()) return null;

      return transactionBuilder.buildBondExtra({
        chain,
        asset,
        accountId: initiator.accountId,
        amount: fromPrecision(reservable, asset.precision),
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

  // The fee payer and every hop on the route need a balance the validator can
  // read. For an account outside the selected wallet the dashboard only fetched
  // it once, and only on chains that were connected at that moment — so ask
  // again for exactly the accounts this operation is about to charge.
  sample({
    clock: $route,
    filter: (route) => route.length > 0,
    target: balanceSubModel.fetchAccounts,
  });

  const $available = combine(
    { isDraftMode: draftMode.$isDraftMode, reservable: $reservable, fee: $fee },
    ({ isDraftMode, reservable, fee }) => {
      // Draft mode: no fee to subtract — the eventual signer pays it at submit
      // time, so Max is the draft source's reservable, whole.
      if (isDraftMode) return reservable;

      const available = fee ? reservable.sub(fee) : reservable;

      return available.isNeg() ? BN_ZERO : available;
    },
  );

  const $maxAmount = combine(
    { mode: $mode, activeStake: $activeStake, available: $available },
    ({ mode, activeStake, available }) => (mode ? getMaxAmount(mode, { activeStake, available }) : BN_ZERO),
  );

  sample({
    clock: maxAmountRequested,
    source: { maxAmount: $maxAmount, asset: $asset },
    filter: ({ asset }) => nonNullable(asset),
    fn: ({ maxAmount, asset }) => fromPrecision(maxAmount, asset!.precision),
    target: amountChanged,
  });

  // --- validation ----------------------------------------------------------

  /**
   * One validation store, two rule sets.
   *
   * `unstakeValidator` carries the shared fee / existential-deposit checks;
   * `bondExtraValidator` adds the "can this account actually reserve the amount
   * it is bonding" rule on top of them. Dispatching between them here keeps a
   * single round trip per change instead of two stores validating in parallel,
   * one of which is always answering a question nobody asked.
   */
  type ValidatorParams = Parameters<typeof bondExtraValidator>[0] & { mode: AmountFlowRequest['mode'] };

  const validateTx = (params: ValidatorParams) =>
    params.mode === 'addStake' ? bondExtraValidator(params) : unstakeValidator(params);

  const {
    $errors,
    $valid: $isTxValid,
    $pending: $validating,
    $balanceValidationResults,
  } = createTxValidationStore({
    validator: validateTx,
    params: {
      api: $api,
      chain: $chain,
      asset: $asset,
      balances: balanceModel.$balanceMap,
      route: $route,
      transaction: $tx,
      amount: $amount,
      mode: $mode,
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

  /**
   * More than `Max` allows — the whole active stake when unbonding, everything
   * spendable after the fee when adding to it. Both the field's red frame and
   * the callout that explains it read this one store, so the frame can never
   * appear without its words.
   */
  const $isOverMax = combine($amountPlanck, $maxAmount, (amount, maxAmount) => amount.gt(maxAmount));

  /** The amount alone — before anything the node has to say about it. */
  const $isAmountValid = combine(
    { amount: $amountPlanck, isOverMax: $isOverMax, limitReached: $unlockingLimitReached },
    ({ amount, isOverMax, limitReached }) => !amount.isZero() && !isOverMax && !limitReached,
  );

  // --- draft mode ----------------------------------------------------------
  //
  // `draftMode` itself is created up in the balance section — the available
  // balance branches on it.

  // A request that arrives already knowing nobody local signs it (an
  // address-book position) opens with draft mode on, instead of making the
  // user discover the toggle. This runs after the binding's own
  // `.reset(flowStarted)` on `$isDraftMode` regardless of registration order:
  // the toggle routes through the extra `draftModeToggled` event hop, one
  // graph level deeper than the reset's direct store link, and effector
  // resolves same-tick conflicts by graph depth, not source order.
  sample({
    clock: flowStarted,
    filter: (request) => request.signingMode === 'draft',
    fn: () => true,
    target: draftMode.draftModeToggled,
  });

  /**
   * Draft-mode transaction, built from the path's own source rather than from
   * the connected wallet — the whole point of a draft is that nobody here can
   * sign it.
   *
   * The chill wrapper only applies when that source really is the position we
   * were opened for; against any other account the remaining-stake arithmetic
   * describes nothing, and chilling a non-nominator just fails.
   */
  const $draftCoreTx = combine(
    {
      mode: $mode,
      chain: $chain,
      asset: $asset,
      amount: $amount,
      position: $position,
      withChill: $withChill,
      path: draftMode.$draftSigningPath,
      isPathComplete: draftMode.$isDraftPathComplete,
    },
    ({ mode, chain, asset, amount, position, withChill, path, isPathComplete }) => {
      if (!mode || !chain || !asset || !amount || !isPathComplete) return null;

      const accountId = path[0]?.accountId;
      if (!accountId) return null;

      if (mode === 'addStake') {
        return transactionBuilder.buildBondExtra({ chain, asset, accountId, amount });
      }

      return transactionBuilder.buildUnstake({
        chain,
        asset,
        accountId,
        amount,
        withChill: withChill && accountId === position?.accountId,
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
    source: 'staking-amount-flow-draft-mode',
    $callDataHex: $draftCallDataHex,
    $networkStore,
    $canSave: $canSaveAsDraft,
  });

  // A draft is created *instead of* signing, never alongside it: once the draft
  // lands the flow is over and the modal closes.
  wireDraftCloseRedirect({ $initiatedDraft: draftMode.$initiatedDraft, flowFinished: flowClosed });

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
   * `Continue` gate.
   *
   * Draft mode never reaches the confirm — it has its own button and its own
   * gate — so signing is off the table there.
   */
  const $canContinue = combine(
    {
      isDraftMode: draftMode.$isDraftMode,
      amountValid: $isAmountValid,
      txValid: $isTxValid,
      preparing: $preparing,
      tx: $tx,
      noRouteSigner: $noRouteSigner,
    },
    ({ isDraftMode, amountValid, txValid, preparing, tx, noRouteSigner }) =>
      !isDraftMode && amountValid && txValid && !preparing && nonNullable(tx) && !noRouteSigner,
  );

  sample({
    clock: continueRequested,
    source: $canContinue,
    filter: (canContinue) => canContinue,
    fn: () => Step.CONFIRM,
    target: stepChanged,
  });

  // --- basket ---------------------------------------------------------------
  //
  // The same "sign later" affordance every old staking flow carries. The basket
  // signs the stored core call directly by its initiator (no wrapping in the
  // basket context), so it is only offered when the initiator's own wallet is
  // one the basket can sign with — never for watch-only, multisig or proxied
  // initiators. Draft mode is mutually exclusive by nature: a draft is
  // "somebody else signs later", the basket is "this wallet signs later".

  const $canUseBasket = combine(
    { wallet: $wallet, isDraftMode: draftMode.$isDraftMode, coreTx: $coreTx },
    ({ wallet, isDraftMode, coreTx }) =>
      !isDraftMode && nonNullable(wallet) && basketUtils.isBasketAvailable(wallet) && nonNullable(coreTx),
  );

  const basketSaved = sample({
    clock: txSaved,
    source: { canUseBasket: $canUseBasket, coreTx: $coreTx, route: $route },
    filter: ({ canUseBasket, coreTx }) => canUseBasket && nonNullable(coreTx),
  });

  sample({
    clock: basketSaved,
    fn: ({ coreTx, route }) => [
      {
        initiatorAccountId: coreTx!.accountId,
        coreTx: coreTx!,
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
      amount: $amountPlanck,
      remaining: $remainingStake,
      activeStake: $activeStake,
      withChill: $withChill,
    },
    ({
      request,
      signatory,
      route,
      tx,
      coreTx,
      amount,
      remaining,
      activeStake,
      withChill,
    }): AmountFlowConfirm | null => {
      if (!request || !request.account || !signatory || !tx || !coreTx) return null;

      return {
        chain: request.chain,
        initiator: request.account,
        signatory,
        route: route.length > 0 ? route : [request.account],
        tx,
        coreTx,
        mode: request.mode,
        amount: amount.toString(),
        resultingStake: (request.mode === 'unbond' ? remaining : activeStake.add(amount)).toString(),
        withChill,
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
    $signatory,
    $route,
    $signingPath,
    $isDirectSigner,

    $amount: readonly($amount),
    $amountPlanck,
    $activeStake,
    $reservable,
    $available,
    $maxAmount,
    $remainingStake,
    $isFullUnbond,
    $isBelowMinimumBond,
    $isOverMax,
    $unlockingLimitReached,
    $minimumBond,
    $bondingDuration,
    $maxUnlockingChunks,
    $eraAnchor,
    $withChill,

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

    unbondRequested,
    addStakeRequested,
    flowStarted,
    flowClosed,
    flowCompleted,
    stepChanged,
    amountChanged,
    maxAmountRequested,
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
export const amountFlowModel = createAmountFlowModel();

export const amountFlowUtils = {
  isNoneStep: (step: Step) => step === Step.NONE,
  isInitStep: (step: Step) => step === Step.INIT,
  isConfirmStep: (step: Step) => step === Step.CONFIRM,
  isSignStep: (step: Step) => step === Step.SIGN,
  isSubmitStep: (step: Step) => step === Step.SUBMIT,
  isBasketStep: (step: Step) => step === Step.BASKET,
};
