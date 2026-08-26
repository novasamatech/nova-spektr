import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { t } from 'i18next';
import { readonly } from 'patronum';

import { type Asset, type Balance, type BalanceId, type Transaction } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type ValidationResult,
  MULTISIG_DEPOSIT_ACTION,
  createComplexTxStore,
  createRouteSignerStore,
  createTxValidationStore,
  createTxValidator,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { type TransactionValidationDryRunError } from '@/shared/ui-entities';
import { type AnyAccount, accountService, accounts, transactionService } from '@/domains/network';
import { type PayoutsResourceParams, type UnclaimedPayout, era, payouts } from '@/domains/staking';
import { balanceModel } from '@/entities/balance';
import { basketUtils } from '@/entities/basket';
import { networkModel, networkUtils } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { transactionBuilder, transactionService as callDataService } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { createDraftModeBinding, wireDraftCloseRedirect } from '@/features/drafts';
import { signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { createSigningPathModel, graphModel } from '@/features/signing-path';
import { buildClaimPlans, selectClaimableRequests, sumPayouts, toPayoutArgs } from '../lib/plan';
import { buildPayoutRefetchParams } from '../lib/refetch';
import { type ClaimPlan, type ClaimRequest, type ClaimRewardsConfirm, type ClaimedRewards, Step } from '../types';

import { confirmModel } from './confirm';

const { payoutsResource } = payouts;

const claimRequested = createEvent<ClaimRequest[]>();
const flowFinished = createEvent();
const stepChanged = createEvent<Step>();
const txSaved = createEvent();
/** A claim that made it on chain. The dashboard reacts to this; no toast here. */
const rewardsClaimed = createEvent<ClaimedRewards>();

const $step = createStore(Step.NONE).on(stepChanged, (_, step) => step);

/**
 * The payouts the user pressed on, snapshotted.
 *
 * `useUnclaimedPayouts` keeps moving underneath — an era rolls over, a
 * concurrent claim lands — and the set being signed must not. The request is
 * also normalised here: merged per account, deduplicated, sorted oldest era
 * first, and narrowed to a single chain (see `selectClaimableRequests`).
 */
const $selection = createStore<{ claimable: ClaimRequest[]; skipped: ClaimRequest[] }>({
  claimable: [],
  skipped: [],
})
  .on(claimRequested, (_, requests) => selectClaimableRequests(requests))
  .reset(flowFinished);

const $requests = $selection.map(({ claimable }) => claimable);

/**
 * Requests the session could not take: rewards sitting on another network.
 * Surfaced on the confirm rather than silently discarded.
 */
const $skippedRequests = $selection.map(({ skipped }) => skipped);

sample({
  clock: claimRequested,
  filter: (requests) => selectClaimableRequests(requests).claimable.length > 0,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

const $chain = $requests.map((requests) => requests.at(0)?.chain ?? null);
const $asset = $requests.map((requests) => requests.at(0)?.asset ?? null);
const $api = combine(networkModel.$apis, $chain, (apis, chain) => (chain ? (apis[chain.chainId] ?? null) : null));

/**
 * No connection → no transaction → no fee and nothing to sign. The same guard
 * the old staking forms carry: a session opened on a disconnected chain would
 * otherwise build calls against a stale or absent api. Gates the primary call
 * below AND `$extraEntries` — the extras wrap and price themselves off their
 * own entries, independently of the primary transaction existing, so gating the
 * primary alone would not stop them. The draft path stays ungated on purpose —
 * a draft is call data for somebody else to sign later.
 */
const $isChainConnected = combine(networkModel.$connectionStatuses, $chain, (statuses, chain) => {
  if (!chain) return false;

  const status = statuses[chain.chainId];
  if (!status) return false;

  return networkUtils.isConnectedStatus(status);
});

/**
 * Every transaction the session will sign. One account with no more payouts
 * than the batch cap yields exactly one plan — the overwhelmingly common case,
 * in which this flow is shaped exactly like `vesting-claim`.
 */
/**
 * Who pays for the payout, when the user chooses somebody else.
 *
 * A payout call names the **validator** and is permissionless — the reward
 * reaches each nominator's own payee whoever submits it — so the payer is a
 * free choice, not a property of the rewards. Overriding it rewrites the sender
 * of every plan, and fee, route and validation follow from there.
 */
const payerChanged = createEvent<AnyAccount | null>();
const $payerOverride = createStore<AnyAccount | null>(null)
  .on(payerChanged, (_, account) => account)
  .reset(claimRequested, flowFinished);

const $payerWallet = combine($payerOverride, walletModel.$wallets, (payer, wallets) =>
  payer ? (wallets.find((w) => w.id === payer.walletId) ?? null) : null,
);

const $payer = combine($payerOverride, $payerWallet, (account, wallet) =>
  account && wallet ? { account, wallet } : null,
);

const $payingRequests = combine($requests, $payer, (requests, payer) =>
  payer ? requests.map((request) => ({ ...request, account: payer.account, wallet: payer.wallet })) : requests,
);

const $plans = $payingRequests.map(buildClaimPlans);

/** The plan the confirm screen is anchored on: fee, route and validation. */
const $primaryPlan = $plans.map((plans) => plans.at(0) ?? null);
const $initiator = $primaryPlan.map((plan) => plan?.account ?? null);

/** Whose rewards these are — the payer may be someone else entirely. */
const $nominators = $requests.map((requests) => requests.map((request) => request.account));

const $totalAmount = $requests.map((requests) => sumPayouts(requests.flatMap((request) => request.payouts)));
const $allPayouts = $requests.map((requests) => requests.flatMap((request) => request.payouts));

/**
 * The signing route the user may change: the initiator plus any multisig/proxy
 * hops between it and an account that can actually sign.
 *
 * Offered for the primary account only. The account at the end of the route
 * pays the fee and reserves the multisig deposit, so the choice is load-bearing
 * — but a per-account picker for a multi-account claim would be a screen of its
 * own. Additional accounts take their default path (see `$extraRoutes`).
 */
const { $signingPath, signingPathChanged, $signatoryFromPath, $pathRoute } = createSigningPathModel({
  initiator: $initiator,
  chain: $chain,
  resetOn: flowFinished,
  // A payout is permissionless: the payer is any key we hold, so the path
  // starts from the initiator itself when it is a plain key.
  includeOwnSigners: true,
});

const buildPayoutTx = (plan: ClaimPlan, accountId: AccountId): Transaction =>
  transactionBuilder.buildPayoutStakers({
    chain: plan.chain,
    accountId,
    payouts: toPayoutArgs(plan.payouts),
  });

const $primaryCoreTx = combine($primaryPlan, $isChainConnected, (plan, isConnected) =>
  plan && isConnected ? buildPayoutTx(plan, plan.account.accountId) : null,
);

/**
 * A regular account signs for itself and has no signing path at all
 * (`pickDefaultPath` bails on anything that is neither multisig nor proxied),
 * so the path yields no signatory. Falling back to the initiator is what keeps
 * the route non-empty — without it the wrapping step refuses the transaction
 * and the confirm waits forever on a fee that can never be priced.
 */
/**
 * The source card of the path _is_ the payer field, so editing it moves who
 * pays. No loop: the path model marks a hand-picked path as a user override and
 * stops recomputing defaults for it.
 */
sample({
  clock: signingPathChanged,
  source: accounts.$list,
  filter: (available, path) => {
    const source = path.at(0);

    return nonNullable(source) && available.some((account) => account.accountId === source.accountId);
  },
  fn: (available, path) => available.find((account) => account.accountId === path[0]?.accountId) ?? null,
  target: payerChanged,
});

const $routeSignatory = combine($signatoryFromPath, $initiator, (fromPath, initiator) => fromPath ?? initiator);

const { $route, $tx, $fee, $pendingFee, $pendingWrapping } = createComplexTxStore({
  api: $api,
  chain: $chain,
  transaction: $primaryCoreTx,
  accounts: accounts.$list,
  initiator: $initiator,
  signatory: $routeSignatory,
  routeOverride: $pathRoute,
});

/** Display/draft terminal hop; `$routeSigner` is the permission-checked one. */
const $signatory = combine($route, $initiator, (route, initiator) => route.at(-1) ?? initiator);

/**
 * `staking.payout_stakers_by_page` moves nothing out of the sender's balance —
 * it credits the nominators of the named validator, whoever sends it. So there
 * are no operation-specific balance rules: what can go wrong is paying for it
 * (a fully-bonded stash whose free balance is dust) and reserving the multisig
 * deposit, and those are exactly what the built-in checks cover.
 */
const validator = createTxValidator();

const {
  $errors,
  $valid: $isTxValid,
  $pending: $validating,
  $balanceValidationResults,
} = createTxValidationStore({
  validator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $hasMultisigAccount = $route.map((route) => route.some((account) => accountUtils.isAnyMultisigAccount(account)));

const $multisigDeposit = $balanceValidationResults.map((results) =>
  getActionRequiredAmount(results, MULTISIG_DEPOSIT_ACTION).reduce(
    (deposit, action) => deposit.add(action.required),
    BN_ZERO,
  ),
);

// ---------------------------------------------------------------------------
// Plans beyond the first
//
// Chunking (an account over the batch cap) and multi-account claims both land
// here. Each extra plan needs its own wrapped transaction; only the primary one
// gets a user-editable route, the rest take the default path their account
// would take anywhere else in the app.
// ---------------------------------------------------------------------------

type ExtraEntry = {
  plan: ClaimPlan;
  route: AnyAccount[];
  coreTx: Transaction;
};

const $extraEntries = combine(
  {
    plans: $plans,
    primaryRoute: $route,
    primaryAccountId: $initiator.map((initiator) => initiator?.accountId ?? null),
    chain: $chain,
    allAccounts: accounts.$list,
    multisigByAccountId: graphModel.$multisigByAccountId,
    proxies: proxyModel.$proxies,
    ownSignerAccountIds: graphModel.$ownSignerAccountIds,
    resolveName: graphModel.$nameResolver,
    isConnected: $isChainConnected,
  },
  ({
    plans,
    primaryRoute,
    primaryAccountId,
    chain,
    allAccounts,
    multisigByAccountId,
    proxies,
    ownSignerAccountIds,
    resolveName,
    isConnected,
  }): ExtraEntry[] => {
    // The connection term is not redundant with the primary's gate: extras
    // wrap and price through their own effect pipeline, clocked off this very
    // store — they would proceed against a stale api even with `$primaryCoreTx`
    // already null.
    if (nullable(chain) || !isConnected || plans.length < 2) return [];

    const routeCache = new Map<AccountId, AnyAccount[]>();
    if (primaryAccountId && primaryRoute.length > 0) {
      routeCache.set(primaryAccountId, primaryRoute);
    }

    const resolveRoute = (account: AnyAccount): AnyAccount[] => {
      const cached = routeCache.get(account.accountId);
      if (cached) return cached;

      const defaultPath = graphModel.pickDefaultPath({
        initiator: account,
        chainId: chain.chainId,
        multisigByAccountId,
        proxies,
        ownSignerAccountIds,
        resolveName,
      });

      const leaf = defaultPath.at(-1);
      const signatory =
        leaf && leaf.kind === 'signer'
          ? (allAccounts.find(
              (candidate) =>
                candidate.accountId === leaf.accountId && accountService.isAccountAvailableOnChain(candidate, chain),
            ) ?? account)
          : account;

      const route = accountService.findRoute(account, signatory, allAccounts, chain);
      routeCache.set(account.accountId, route);

      return route;
    };

    return plans.slice(1).map((plan) => {
      const route = resolveRoute(plan.account);

      return { plan, route, coreTx: buildPayoutTx(plan, plan.account.accountId) };
    });
  },
);

type WrappedExtra = ExtraEntry & { tx: Transaction; signatory: AnyAccount };

const wrapExtraTxsFx = createEffect(async ({ api, entries }: { api: ApiPromise; entries: ExtraEntry[] }) => {
  const wrapped: WrappedExtra[] = [];
  const dropped: TransactionValidationDryRunError[] = [];

  for (const entry of entries) {
    const signatory = entry.route.at(-1);
    if (!signatory) {
      // A route with no terminal hop can be neither wrapped nor signed.
      // Surfaced as a per-entry validation error instead of silently shrinking
      // the set — a dropped entry used to leave `$preparing` waiting forever.
      //
      // The dry-run shape is used for its rendering, not its meaning: it is the
      // only error `TransactionValidationError` renders verbatim under a title
      // of the sender's choosing (a bare `{ message }` gets a "Dry run error:"
      // prefix, which would be a lie here). `failureReason` is unused when
      // `description` is present.
      dropped.push({
        dryRunError: true,
        failureReason: 'no-route-signer',
        title: t('staking.flow.noSignerTitle'),
        description: t('staking.claimRewards.extraNoSignerError'),
      });
      continue;
    }

    const tx = await transactionService.wrapLegacyTransaction(entry.coreTx, entry.route, api);
    // Same reason as in `createComplexTxStore`: the legacy transaction shape
    // carries a stale signatory, and the wrapping step does not set it.
    tx.accountId = signatory.accountId;

    wrapped.push({ ...entry, tx, signatory });
  }

  return { wrapped, dropped };
});

/**
 * Per-extra verdicts, one entry per plan beyond the first: the SAME validator
 * the primary transaction goes through, plus the extra's own priced fee. An
 * entry the wrapping step dropped, or whose validation failed outright, arrives
 * here as an error with no fee. Sign stays blocked until this list covers every
 * extra plan (see `$preparing`), and `$canSign` refuses any entry that is not
 * both clean and priced.
 */
type ExtraValidationError = ValidationResult['errors'][number] | TransactionValidationDryRunError;

type ExtraValidation = {
  errors: ExtraValidationError[];
  fee: BN | null;
};

const validateExtrasFx = createEffect(
  async ({
    api,
    asset,
    balances,
    wrapped,
    dropped,
  }: {
    api: ApiPromise;
    asset: Asset;
    balances: Record<BalanceId, Balance>;
    wrapped: WrappedExtra[];
    dropped: TransactionValidationDryRunError[];
  }): Promise<ExtraValidation[]> => {
    const validated: ExtraValidation[] = [];

    for (const entry of wrapped) {
      const { errors, balanceValidationResults } = await validator({
        api,
        asset,
        balances,
        route: entry.route,
        transaction: entry.tx,
      });

      // The validator already asked the node to price this very transaction for
      // its fee-affordability rule; `required` on the `fee` action is that
      // quote, so reading it back avoids a second `paymentInfo` round trip.
      const fee =
        getActionRequiredAmount(balanceValidationResults, 'fee', entry.signatory.accountId).at(0)?.required ?? null;

      // A clean verdict always carries the fee quote its affordability rule
      // computed, so "no errors AND no priced fee" means the validation never
      // actually ran to completion (the validator itself now fails closed on
      // throws, so this is a belt-and-braces guard for any other path that
      // yields a feeless clean verdict). Fail closed: an extra that could not
      // be checked must block signing and say so, not pass by silence.
      if (errors.length === 0 && nullable(fee)) {
        validated.push({
          errors: [
            {
              dryRunError: true,
              failureReason: 'extra-validation-failed',
              description: t('staking.claimRewards.extraValidationFailedError'),
            },
          ],
          fee: null,
        });
        continue;
      }

      validated.push({ errors, fee });
    }

    return [...validated, ...dropped.map((error) => ({ errors: [error], fee: null }))];
  },
);

const $extraWrapped = createStore<WrappedExtra[]>([]).reset(flowFinished, claimRequested);
const $extraValidation = createStore<ExtraValidation[]>([]).reset(flowFinished, claimRequested);

const extraWrappingRequested = sample({
  clock: [$extraEntries, $api],
  source: { api: $api, entries: $extraEntries },
}).filterMap(({ api, entries }) => (nonNullable(api) && entries.length > 0 ? { api, entries } : undefined));

sample({
  clock: extraWrappingRequested,
  target: wrapExtraTxsFx,
});

sample({
  clock: wrapExtraTxsFx.doneData,
  fn: ({ wrapped }) => wrapped,
  target: $extraWrapped,
});

const extraValidationRequested = sample({
  clock: wrapExtraTxsFx.doneData,
  source: { api: $api, asset: $asset, balances: balanceModel.$balanceMap },
  fn: ({ api, asset, balances }, { wrapped, dropped }) => ({ api, asset, balances, wrapped, dropped }),
}).filterMap(({ api, asset, ...rest }) =>
  nonNullable(api) && nonNullable(asset) ? { api, asset, ...rest } : undefined,
);

sample({
  clock: extraValidationRequested,
  target: validateExtrasFx,
});

sample({
  clock: validateExtrasFx.doneData,
  target: $extraValidation,
});

/** Extras' validation failures, flattened for the same alert the primary uses. */
const $extraErrors = $extraValidation.map((entries) => entries.flatMap((entry) => entry.errors));

/**
 * Everything the confirm is still waiting on before anything may be signed.
 *
 * The completeness term counts `$extraValidation`, not `$extraWrapped`: every
 * extra plan produces a validation entry — a verdict or a dropped-entry error —
 * so an extra that cannot be wrapped still lets the confirm settle (with its
 * error shown) instead of spinning forever.
 */
const $preparing = combine(
  {
    pendingFee: $pendingFee,
    pendingWrapping: $pendingWrapping,
    validating: $validating,
    wrappingExtra: wrapExtraTxsFx.pending,
    validatingExtras: validateExtrasFx.pending,
    plans: $plans,
    extraValidation: $extraValidation,
  },
  ({ pendingFee, pendingWrapping, validating, wrappingExtra, validatingExtras, plans, extraValidation }) =>
    pendingFee ||
    pendingWrapping ||
    validating ||
    wrappingExtra ||
    validatingExtras ||
    extraValidation.length !== Math.max(plans.length - 1, 0),
);

/**
 * The primary transaction's quoted fee plus each extra's own quoted fee.
 *
 * Until every extra has been priced, the figure falls back to the old
 * per-transaction × count approximation. That window is never signable: while
 * quotes are pending `$preparing` blocks Sign, and an extra that never gets a
 * quote (a dropped route, a validation that failed outright) carries an error
 * and no fee — both of which `$canSign` refuses.
 */
const $totalFee = combine(
  { fee: $fee, plans: $plans, extraValidation: $extraValidation },
  ({ fee, plans, extraValidation }) => {
    if (nullable(fee)) return fee;

    const extraFees = extraValidation.map((entry) => entry.fee).filter(nonNullable);
    const allExtrasPriced =
      extraValidation.length === Math.max(plans.length - 1, 0) && extraFees.length === extraValidation.length;

    if (!allExtrasPriced) return fee.mul(new BN(Math.max(plans.length, 1)));

    return extraFees.reduce((total, extraFee) => total.add(extraFee), fee);
  },
);

// Created ahead of its own section below: the sign gate must stand down in
// draft mode, where nobody local is expected to sign.
const draftMode = createDraftModeBinding({ formInitiated: claimRequested, chainChanged: claimRequested });

// A session that arrives already knowing nobody local pays it opens with draft
// mode on. `signingMode` carries the *payer's* mode (payouts are permissionless,
// so producers substitute a signable payer where they can) — `every` therefore
// only holds when the whole session really has no one to sign.
sample({
  clock: claimRequested,
  filter: (requests) => requests.length > 0 && requests.every((request) => request.signingMode === 'draft'),
  fn: () => true,
  target: draftMode.draftModeToggled,
});

const $routeSigner = createRouteSignerStore($route);

/**
 * No one on the resolved route can actually sign — the chosen payer is a
 * watch-only account. Blocks the gate and surfaces an explicit message instead
 * of a silently dead button.
 */
const $noRouteSigner = combine(
  { isDraftMode: draftMode.$isDraftMode, initiator: $initiator, routeSigner: $routeSigner },
  ({ isDraftMode, initiator, routeSigner }) => !isDraftMode && nonNullable(initiator) && nullable(routeSigner),
);

const $canSign = combine(
  {
    tx: $tx,
    valid: $isTxValid,
    preparing: $preparing,
    noRouteSigner: $noRouteSigner,
    extraValidation: $extraValidation,
  },
  ({ tx, valid, preparing, noRouteSigner, extraValidation }) =>
    nonNullable(tx) &&
    valid &&
    !preparing &&
    !noRouteSigner &&
    // Clean AND priced — an extra without a fee quote was never actually
    // checked (dropped route, incomplete validation), and fail-closed
    // means such an entry can never be signed past.
    extraValidation.every((entry) => entry.errors.length === 0 && nonNullable(entry.fee)),
);

// ---------------------------------------------------------------------------
// Basket
//
// The same "sign later" affordance every old staking flow carries. The basket
// signs each stored core call directly by its initiator (no wrapping in the
// basket context), so it is only offered when EVERY payer's wallet is one the
// basket can sign with — never watch-only, multisig or proxied payers. Unlike a
// draft (one call data), the basket takes a list natively, so a multi-plan
// claim goes in whole: one entry per plan, each its own extrinsic later.
// ---------------------------------------------------------------------------

const $canUseBasket = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    plans: $plans,
    coreTx: $primaryCoreTx,
    extras: $extraWrapped,
  },
  ({ isDraftMode, plans, coreTx, extras }) =>
    !isDraftMode &&
    plans.length > 0 &&
    plans.every((plan) => basketUtils.isBasketAvailable(plan.wallet)) &&
    nonNullable(coreTx) &&
    // Every plan beyond the first must have made it through wrapping — a
    // partial claim must never be stored as if it were the whole one.
    extras.length === plans.length - 1,
);

const basketSaved = sample({
  clock: txSaved,
  source: {
    canUseBasket: $canUseBasket,
    coreTx: $primaryCoreTx,
    route: $route,
    extras: $extraWrapped,
  },
  filter: ({ canUseBasket, coreTx }) => canUseBasket && nonNullable(coreTx),
});

sample({
  clock: basketSaved,
  fn: ({ coreTx, route, extras }) => {
    const createdAt = Date.now();

    return [
      { initiatorAccountId: coreTx!.accountId, coreTx: coreTx!, route, createdAt },
      ...extras.map((entry) => ({
        initiatorAccountId: entry.coreTx.accountId,
        coreTx: entry.coreTx,
        route: entry.route,
        createdAt,
      })),
    ];
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: basketSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

const $confirmDraft = combine(
  {
    plans: $plans,
    chain: $chain,
    initiator: $initiator,
    signatory: $signatory,
    route: $route,
    tx: $tx,
    coreTx: $primaryCoreTx,
    extra: $extraWrapped,
  },
  ({ plans, chain, initiator, signatory, route, tx, coreTx, extra }): ClaimRewardsConfirm[] => {
    const primaryPlan = plans.at(0);
    if (!primaryPlan || !chain || !initiator || !signatory || !tx || !coreTx) return [];
    if (extra.length !== plans.length - 1) return [];

    const primary: ClaimRewardsConfirm = {
      id: 0,
      chain,
      initiator,
      signatory,
      route: route.length > 0 ? route : [initiator],
      tx,
      coreTx,
      amount: sumPayouts(primaryPlan.payouts),
      payoutCount: primaryPlan.payouts.length,
    };

    return [
      primary,
      ...extra.map((entry, index): ClaimRewardsConfirm => {
        const routeOrSelf = entry.route.length > 0 ? entry.route : [entry.plan.account];

        return {
          id: index + 1,
          chain: entry.plan.chain,
          initiator: entry.plan.account,
          signatory: entry.signatory,
          route: routeOrSelf,
          tx: entry.tx,
          coreTx: entry.coreTx,
          amount: sumPayouts(entry.plan.payouts),
          payoutCount: entry.plan.payouts.length,
        };
      }),
    ];
  },
);

sample({
  clock: $confirmDraft,
  filter: (confirms) => confirms.length > 0,
  target: confirmModel.init,
});

// ---------------------------------------------------------------------------
// Draft mode
// ---------------------------------------------------------------------------

wireDraftCloseRedirect({ $initiatedDraft: draftMode.$initiatedDraft, flowFinished });

/**
 * A draft carries exactly one call, so draft mode is only offered when the
 * claim _is_ one transaction. Above the batch cap, or across several accounts,
 * the session is several extrinsics and there is no single call data to save —
 * the toggle is hidden rather than silently saving a partial claim.
 */
const $canUseDraftMode = $plans.map((plans) => plans.length === 1);

const $draftCoreTx = combine(
  {
    plans: $plans,
    path: draftMode.$draftSigningPath,
    isPathComplete: draftMode.$isDraftPathComplete,
  },
  ({ plans, path, isPathComplete }) => {
    const plan = plans.at(0);
    if (!plan || plans.length !== 1 || !isPathComplete) return null;

    const sourceAccountId = path.at(0)?.accountId;
    if (!sourceAccountId) return null;

    // The sender of `payout_stakers_by_page` is only the fee payer — the reward
    // goes to the validator's nominators either way — so a draft signed by
    // whoever the path starts at pays out exactly the same rewards.
    return buildPayoutTx(plan, sourceAccountId);
  },
);

const $draftCallDataHex = combine($draftCoreTx, $api, (tx, api) => callDataService.getCallDataHex(tx, api));

const $draftNetworkStore = $chain.map((chain) => (chain ? { chain } : null));

const $canSaveAsDraft = combine(
  {
    canUseDraftMode: $canUseDraftMode,
    isDraftMode: draftMode.$isDraftMode,
    isPathComplete: draftMode.$isDraftPathComplete,
    callData: $draftCallDataHex,
    network: $draftNetworkStore,
  },
  ({ canUseDraftMode, isDraftMode, isPathComplete, callData, network }) =>
    canUseDraftMode && isDraftMode && isPathComplete && nonNullable(callData) && nonNullable(network),
);

draftMode.connectSave({
  source: 'staking-claim-rewards-draft-mode',
  $callDataHex: $draftCallDataHex,
  $networkStore: $draftNetworkStore,
  $canSave: $canSaveAsDraft,
});

// ---------------------------------------------------------------------------
// Sign → submit
// ---------------------------------------------------------------------------

sample({
  clock: confirmModel.startSigning,
  source: draftMode.$isDraftMode,
  filter: (isDraftMode) => !isDraftMode,
  fn: () => Step.SIGN,
  target: stepChanged,
});

/**
 * One signing payload per transaction. Several of them is the normal case here:
 * an account over the batch cap signs its chunks in one session, and the vault
 * screens increment the nonce per payload, so the chunks land in order instead
 * of colliding on the same nonce.
 */
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
// Only a flow that is *at* the sign step may claim the signature; one parked on
// CONFIRM would otherwise submit a foreign payload as its own.
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

/**
 * What actually landed, not what was attempted.
 *
 * One signing payload is built per plan and in plan order, so a result's `id`
 * is its plan's index. Announcing `$requests` and `$totalAmount` wholesale
 * reported the full amount as claimed even when only one chunk of several
 * succeeded.
 */
const claimLanded = sample({
  clock: submitModel.done,
  source: { step: $step, plans: $plans, chain: $chain, asset: $asset },
  filter: ({ step }, results) =>
    step === Step.SUBMIT && results.some((result) => result.result === ExtrinsicResult.SUCCESS),
  fn: ({ plans, chain, asset }, results): ClaimedRewards | null => {
    if (!chain || !asset) return null;

    const landed = results
      .filter((result) => result.result === ExtrinsicResult.SUCCESS)
      .map((result) => plans[result.id])
      .filter(nonNullable);

    const byAccount = new Map<AccountId, { account: AnyAccount; payouts: UnclaimedPayout[] }>();
    for (const plan of landed) {
      const existing = byAccount.get(plan.account.accountId);
      if (existing) {
        existing.payouts = existing.payouts.concat(plan.payouts);
      } else {
        byAccount.set(plan.account.accountId, { account: plan.account, payouts: [...plan.payouts] });
      }
    }

    const claims = [...byAccount.values()].map(({ account, payouts }) => ({
      account,
      payouts,
      amount: sumPayouts(payouts),
    }));

    return {
      chain,
      asset,
      total: sumPayouts(landed.flatMap((plan) => plan.payouts)),
      claims,
    };
  },
}).filterMap((claimed) => claimed ?? undefined);

sample({
  clock: claimLanded,
  target: rewardsClaimed,
});

// ---------------------------------------------------------------------------
// Refreshing the unclaimed figures
//
// `payoutsResource` holds an answer for five minutes, and a landed claim
// invalidates it well inside that window — the era has not changed, so the
// cache key has not either. Fetching alone would be answered from the request
// cache; the entry has to be dropped first.
// ---------------------------------------------------------------------------

const refreshPayoutsFx = createEffect(async (params: PayoutsResourceParams[]) => {
  const invalidate = scopeBind(payoutsResource.invalidate, { safe: true });
  const fetch = scopeBind(payoutsResource.fetch, { safe: true });

  await Promise.all(
    params.map(async (request) => {
      await invalidate(request);
      // A failure here only means the figures stay stale until the next era or
      // the next natural refetch — never a reason to fail the claim.
      await fetch(request).catch(() => null);
    }),
  );
});

sample({
  clock: claimLanded,
  source: { apis: networkModel.$apis, chains: networkModel.$chains, eras: era.eraResource.$cache },
  fn: ({ apis, chains, eras }, claimed) => buildPayoutRefetchParams({ claimed, apis, chains, eras }),
  target: refreshPayoutsFx,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, confirmModel.resetConfirm],
});

export const claimRewardsModel = {
  $step: readonly($step),
  $requests,
  $skippedRequests,
  $plans,
  $chain,
  $asset,
  $initiator,
  /** Whose rewards these are — the payer above may be someone else entirely. */
  $nominators,
  $signatory,
  $route,
  $signingPath,
  $totalAmount,
  $allPayouts,
  $fee,
  $totalFee,
  $pendingFee,
  $errors,
  $extraErrors,
  $hasMultisigAccount,
  $multisigDeposit,
  $preparing,
  $noRouteSigner,
  $canSign,
  $canUseBasket,

  $canUseDraftMode,
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

  claimRequested,
  rewardsClaimed,
  /**
   * Re-reads the unclaimed figures for a set of stashes. Wired to run itself on
   * a landed claim; exposed so a host that knows of another reason to refresh
   * can reuse it.
   */
  refreshPayouts: refreshPayoutsFx,
  flowFinished,
  stepChanged,
  txSaved,
  signingPathChanged,

  draftModeToggled: draftMode.draftModeToggled,
  saveAsDraftRequested: draftMode.saveAsDraftRequested,
  draftPathCommitted: draftMode.draftPathCommitted,
  draftPathEditStarted: draftMode.draftPathEditStarted,
  draftPathEditEnded: draftMode.draftPathEditEnded,
};

export const claimRewardsUtils = {
  isNoneStep: (step: Step) => step === Step.NONE,
  isConfirmStep: (step: Step) => step === Step.CONFIRM,
  isSignStep: (step: Step) => step === Step.SIGN,
  isSubmitStep: (step: Step) => step === Step.SUBMIT,
  isBasketStep: (step: Step) => step === Step.BASKET,
};
