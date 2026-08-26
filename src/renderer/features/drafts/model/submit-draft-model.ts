import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { t } from 'i18next';
import { readonly } from 'patronum';
import { toast } from 'sonner';

import { type CallData, type Chain, ConnectionStatus } from '@/shared/core';
import { createQueuedEffect } from '@/shared/effector';
import { getNativeAsset, nonNullable, nullable } from '@/shared/lib/utils';
import {
  type ExtrinsicConfirmInfo,
  type OperationBlockReason,
  type OperationReadiness,
  createExtrinsicConfirmStore,
  createFeeCalculator,
  createMultisigDeposit,
  createOperationReadiness,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
  createWrappedTxStore,
  isNetworkBlockReason,
} from '@/shared/transactions';
import {
  type Draft,
  type PathNode,
  draftsResource,
  draftsService,
  operationDescriptionsResource,
  operationsService,
} from '@/domains/backend';
import {
  type AnyAccount,
  type AnyTransaction,
  type EncodedTransaction,
  accountService,
  multisigOperationService,
  transactionService,
} from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel } from '@/entities/wallet';
import { backendConfigurationModel } from '@/aggregates/backend';
import { multisigOperationDescription } from '@/aggregates/multisig-operation-description';
import { recipientVerificationModel } from '@/aggregates/recipient-verification';
import { balanceSubModel } from '@/features/assets-balances';
import { type TransactionSigningPayload, signModel } from '@/features/operations/OperationSign';
import { type SuccessResult, ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { MIN_PATH_LENGTH, createPathResolutionStore, isUsablePath } from '@/features/signing-path';
import { tryDecodeCallData } from '../lib/decode-call-data';
import { findSubmittableInitiator } from '../lib/draft-initiator';
import { getDraftDestinationAccountId } from '../lib/get-destination-account-id';
import { preserveSigningPath } from '../lib/preserve-signing-path';

import './drafts-model'; // side-effect: orchestration wiring

enum Step {
  NONE,
  CALL_DATA,
  CONFIRM,
  SIGN,
  SUBMIT,
}

type FlowInput = {
  draft: Draft;
  initiator: AnyAccount | null;
  /**
   * Account shown in the confirm UI (flex multisig or regular multisig). Falls
   * back to initiator.
   */
  displayInitiator?: AnyAccount | null;
  chain: Chain;
};

export type ConfirmInput = ExtrinsicConfirmInfo & {
  draft: Draft;
};

// --- Events ---

const flowStarted = createEvent<FlowInput>();
const flowFinished = createEvent();
const stepChanged = createEvent<Step>();

// --- Stores ---

const $step = readonly(restore(stepChanged, Step.NONE));
const $draft = createStore<Draft | null>(null).reset(flowFinished);
const $chain = createStore<Chain | null>(null).reset(flowFinished);
// Seed initiator from `flowStarted` — used as a fallback for legacy drafts
// that have no `signingPath`. For path-driven drafts the canonical initiator
// is the resolved `signingPath[0]` (see `$initiator` below).
const $flowInitiator = createStore<AnyAccount | null>(null).reset(flowFinished);
const $displayInitiator = createStore<AnyAccount | null>(null).reset(flowFinished);
const $signatory = createEvent<AnyAccount | null>();
const $signatoryStore = createStore<AnyAccount | null>(null).reset(flowFinished);

$signatoryStore.on($signatory, (_, s) => s);

// --- Derived stores ---

const $api = combine($chain, networkModel.$apis, (chain, apis) => (chain ? (apis[chain.chainId] ?? null) : null));

const $transaction = $draft.map((draft): EncodedTransaction | null => {
  if (!draft?.callData) return null;

  return {
    type: 'encoded',
    callData: draft.callData as CallData,
  };
});

// --- Unknown recipient gate ---

const $destinationAccountId = combine({ draft: $draft, api: $api, chain: $chain }, ({ draft, api, chain }) =>
  getDraftDestinationAccountId(draft, api, chain),
);

const $recipientWarning = combine(
  recipientVerificationModel.$resolveWarning,
  $destinationAccountId,
  (resolveWarning, destinationAccountId) => resolveWarning(destinationAccountId),
);

const riskAcknowledgedToggled = createEvent<boolean>();

// A fresh flow never inherits a previous acknowledgement.
const $isRiskAcknowledged = createStore(false)
  .on(riskAcknowledgedToggled, (_, checked) => checked)
  .reset([flowStarted, flowFinished]);

const $recipientRiskAccepted = combine(
  $recipientWarning,
  $isRiskAcknowledged,
  (warning, acknowledged) => warning === 'none' || acknowledged,
);

// --- Late call-data entry (drafts created with the call-data step skipped) ---

const callDataChanged = createEvent<string>();
const callDataConfirmRequested = createEvent();
const $pendingCallData = createStore('').reset(flowFinished);
$pendingCallData.on(callDataChanged, (_, value) => value);

const $pendingCallDataDecoded = combine(
  { callData: $pendingCallData, api: $api, chain: $chain },
  ({ callData, api, chain }) => tryDecodeCallData(callData, api, chain),
);

// "Have we typed something that doesn't decode?" — used to surface an error.
// Empty input is not an error, just a not-yet-confirmable state.
const $pendingCallDataError = combine(
  $pendingCallData,
  $pendingCallDataDecoded,
  (callData, decoded) => callData.length > 0 && !decoded,
);

const $canConfirmCallData = $pendingCallDataDecoded.map(nonNullable);

const submitCallDataFx = createEffect(({ id, callData, baseUrl }: { id: string; callData: string; baseUrl: string }) =>
  draftsService.updateDraft(baseUrl, id, { callData }),
);

// Late-filled call data replaces the draft, and with it the recipient.
$isRiskAcknowledged.reset(submitCallDataFx.doneData);

sample({
  clock: callDataConfirmRequested,
  source: {
    draft: $draft,
    baseUrl: backendConfigurationModel.$backendUrl,
    callData: $pendingCallData,
    canConfirm: $canConfirmCallData,
  },
  filter: ({ draft, baseUrl, canConfirm }) => nonNullable(draft) && nonNullable(baseUrl) && canConfirm,
  fn: ({ draft, baseUrl, callData }) => ({ id: draft!.id, callData, baseUrl: baseUrl! }),
  target: submitCallDataFx,
});

// Replace $draft with the server-confirmed version so $transaction picks up
// the new callData and the rest of the flow proceeds as if it were never
// missing — keeping the saved path if the response doesn't echo one.
sample({
  clock: submitCallDataFx.doneData,
  source: $draft,
  fn: (current, updated) => preserveSigningPath(updated, current),
  target: [$draft, draftsResource.draftUpdated],
});

const showCallDataSubmitErrorFx = createEffect((message: string) => {
  toast.error(t('operations.drafts.editError'), { description: message });
});

sample({
  clock: submitCallDataFx.fail,
  fn: ({ error }) => (error instanceof Error ? error.message : t('operations.drafts.editError')),
  target: showCallDataSubmitErrorFx,
});

// The picked path was persisted with the draft — resolve it back to accounts
// and use it strictly. Falling back to BFS would silently sign through a
// different route than the user authored the draft for.
const $draftSigningPath = $draft.map((draft): PathNode[] =>
  Array.isArray(draft?.signingPath) ? draft.signingPath : [],
);
const $pathResolution = createPathResolutionStore($draftSigningPath, $chain);
const $pathRoute = $pathResolution.map(({ route }) => route);
/**
 * The account from the saved path that has no local counterpart. Surfaced to
 * the UI so the blocked-submit screen can name it instead of saying the path is
 * "unresolvable".
 */
const $pathMissingAccountId = $pathResolution.map(({ missingNode }) => missingNode?.accountId ?? null);

// Canonical initiator: for path-driven drafts the route's first node is the
// authored top of the chain (matters for nested-multisig drafts where
// `multisigAccountId` is the deepest hop, not the root). Legacy drafts have
// no path → fall back to the seed initiator from `flowStarted`.
const $initiator = combine(
  { pathRoute: $pathRoute, flowInitiator: $flowInitiator },
  ({ pathRoute, flowInitiator }) => pathRoute?.[0] ?? flowInitiator,
);

// The draft carries no usable path at all: a legacy draft saved before the
// field existed, or a truncated one. There is nothing to follow, and route
// discovery would pick a route the draft's authors never agreed on — so these
// drafts are not submittable (`hasSigningPath` gates the row's button too).
const $pathMissingError = combine(
  { draft: $draft, saved: $draftSigningPath },
  ({ draft, saved }) => nonNullable(draft) && !isUsablePath(saved),
);

// Draft has a non-trivial saved path but it can't be resolved against the
// current account list (e.g. a wallet that the path traversed has been
// removed). Block the flow rather than wrap silently along a different route.
// Defence-in-depth: `$pathRoute` already returns `null` while `$chain` is
// null, but the explicit guard avoids accidental regressions if the resolver
// ever surfaces a non-null route before chain settles.
const $pathUnresolvedError = combine(
  { saved: $draftSigningPath, resolved: $pathRoute, chain: $chain },
  ({ saved, resolved, chain }) =>
    chain !== null && isUsablePath(saved) && (resolved === null || resolved.length < MIN_PATH_LENGTH),
);

const $pathResolutionError = combine(
  $pathMissingError,
  $pathUnresolvedError,
  (missing, unresolved) => missing || unresolved,
);

// Strictly the saved path, resolved — there is no fallback route. An empty
// array here always means "blocked", never "figure it out from the accounts".
const $route = $pathRoute.map((resolved) => resolved ?? []);

// Hard gate: an unresolvable path must never reach the wrapper. `$route` is
// `[]` in that case, and `wrapTransaction` over an empty route returns the
// *raw* call — signable, and executing from the signer's own account instead of
// the authored route. Withholding the transaction keeps `$wrappedTx` null, so
// the confirm step can't init and the Sign button never appears.
const $transactionToWrap = combine(
  { transaction: $transaction, pathError: $pathResolutionError },
  ({ transaction, pathError }) => (pathError ? null : transaction),
);

const {
  $tx: $wrappedTx,
  $error: $wrappedTxFailure,
  retry: retryWrappedTx,
} = createWrappedTxStore({
  api: $api,
  transaction: $transactionToWrap,
  route: $route,
});

const $wrappedExtrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null).reset(flowFinished);
type WrappedTxErrorKind = 'extrinsic' | 'signing-path-unresolved' | 'signing-path-missing';
const $extrinsicCreationFailed = createStore(false).reset(flowFinished, flowStarted);
// Derived so it always reflects the current path-resolution and extrinsic
// state. A sample-based "set once" store would stick after a transient init
// flip even after the path resolves.
const $wrappedTxErrorKind = combine(
  {
    extrinsicFailed: $extrinsicCreationFailed,
    pathMissing: $pathMissingError,
    pathUnresolved: $pathUnresolvedError,
  },
  ({ extrinsicFailed, pathMissing, pathUnresolved }): WrappedTxErrorKind | null => {
    // Distinct from `unresolved`: nothing to add locally would fix it, so the
    // UI says "recreate the draft" instead of naming an account.
    if (pathMissing) return 'signing-path-missing';
    if (pathUnresolved) return 'signing-path-unresolved';
    if (extrinsicFailed) return 'extrinsic';
    return null;
  },
);
const $wrappedTxError = $wrappedTxErrorKind.map((kind) => kind !== null);

const createWrappedExtrinsicFx = createQueuedEffect(
  ({ transaction, api }: { transaction: AnyTransaction | null; api: ApiPromise | null }) => {
    if (nullable(transaction) || nullable(api)) return null;

    return transactionService.createExtrinsic(transaction, api);
  },
);

sample({
  source: { transaction: $wrappedTx, api: $api },
  target: createWrappedExtrinsicFx,
});

// Guarded rather than a bare forward: the effect is async, so an extrinsic
// built just before the path was found unresolvable could land afterwards and
// re-arm the Sign button on an already-blocked flow.
sample({
  clock: createWrappedExtrinsicFx.doneData,
  source: $pathResolutionError,
  filter: (pathError) => !pathError,
  fn: (_, extrinsic) => extrinsic,
  target: $wrappedExtrinsic,
});

sample({
  clock: createWrappedExtrinsicFx.fail,
  fn: () => null,
  target: $wrappedExtrinsic,
});

$extrinsicCreationFailed
  .on(createWrappedExtrinsicFx.fail, () => true)
  .on(createWrappedExtrinsicFx.doneData, () => false);

// Block the flow when the path can't be resolved — otherwise the empty route
// would wrap to the raw transaction and the user could sign through a wrong path.
sample({
  clock: $pathResolutionError,
  filter: (hasError) => hasError,
  fn: () => null,
  target: $wrappedExtrinsic,
});

const {
  $: $fee,
  $error: $feeFailure,
  retry: retryFee,
} = createFeeCalculator({
  extrinsic: $wrappedExtrinsic,
});

const $graphSignatories = createSignatoriesStore({
  chain: $chain,
  accounts: walletModel.$availableAccounts,
  initiator: $initiator,
});

// Path-driven drafts persist the signer as the final path node. Use that as
// an explicit signatory source as well: proxied routes can be valid even when
// the generic account graph cannot rediscover the leaf from the current wallet
// topology.
const $savedPathSignatory = combine(
  { draft: $draft, accounts: walletModel.$availableAccounts },
  ({ draft, accounts }): AnyAccount | null => (draft ? findSubmittableInitiator(draft, accounts) : null),
);

const $signatories = combine($graphSignatories, $savedPathSignatory, (graphSignatories, savedPathSignatory) => {
  if (!savedPathSignatory) return graphSignatories;
  if (graphSignatories.some((s) => s.accountId === savedPathSignatory.accountId)) return graphSignatories;

  return [savedPathSignatory, ...graphSignatories];
});

// --- Pre-submit validation (generic: fee + multisig deposit) ---

const $asset = $chain.map((chain) => (chain ? getNativeAsset(chain.assets) : null));

const $multisigThreshold = $route.map((route) => {
  const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);

  return multisigAccount ? multisigAccount.threshold : null;
});

const { $multisigDeposit, $pending: $multisigDepositPending } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api,
});

const getDraftSubmitBalanceAccounts = (route: AnyAccount[]): AnyAccount[] => {
  const accountsById = new Map<string, AnyAccount>();

  const addAccount = (account: AnyAccount | null) => {
    if (nullable(account) || accountsById.has(account.accountId)) return;
    accountsById.set(account.accountId, account);
  };

  for (const account of route) {
    if (accountUtils.isAnyMultisigAccount(account)) {
      addAccount(accountService.findNextAccount(route, account));
    }
  }

  addAccount(accountService.findSignatory(route));

  return Array.from(accountsById.values());
};

const $validationBalanceRequests = combine({ route: $route, chain: $chain }, ({ route, chain }) => {
  if (nullable(chain)) return [];

  return getDraftSubmitBalanceAccounts(route).map((account) => ({
    accountId: account.accountId,
    chain,
  }));
});

sample({
  clock: $validationBalanceRequests,
  filter: (requests) => requests.length > 0,
  target: balanceSubModel.fetchAccountIds,
});

const $validationBalances = combine(
  { balances: balanceModel.$balanceMap, requests: $validationBalanceRequests, asset: $asset },
  ({ balances, requests, asset }) => {
    if (nullable(asset) || requests.length === 0) return null;

    const hasRequiredBalances = requests.every(({ accountId, chain }) => {
      const balanceId = balanceUtils.constructBalanceId(accountId, chain.chainId, asset.assetId);
      return nonNullable(balances[balanceId]);
    });

    return hasRequiredBalances ? balances : null;
  },
);

const draftSubmitValidator = createTxValidator();

const {
  $errors: $validationErrors,
  $valid: $validationValid,
  $pending: $validationPending,
  $validationDone,
  $error: $validationFailure,
  retry: retryValidation,
} = createTxValidationStore({
  validator: draftSubmitValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: $validationBalances,
    route: $route,
    transaction: $wrappedTx,
  },
});

// --- Initiator rehydration from signingPath ---

// Pre-select the stored initiator when it is still a valid signatory
sample({
  clock: $signatories,
  source: $draft,
  filter: (draft, signatories) =>
    nonNullable(draft?.initiatorAccountId) && signatories.some((s) => s.accountId === draft!.initiatorAccountId),
  fn: (draft, signatories) => signatories.find((s) => s.accountId === draft!.initiatorAccountId) ?? null,
  target: $signatory,
});

// Path-driven drafts: pre-select the signatory directly from the wallet, so
// the user can sign even if the wallet's account-graph traversal doesn't
// surface this leaf (e.g., proxy hop topology differs from the saved path).
// Filter to accounts that can actually sign — `$availableAccounts` includes
// watch-only entries, and a duplicate accountId imported under a watch-only
// wallet would otherwise be picked first and route the flow to the watch-only
// dead-end UI.
//
// `clock` includes `$draft` (not just `$availableAccounts`) so the sample
// fires on flow start even when the account list is already populated — in
// a steady-state session that's the common case.
sample({
  clock: [walletModel.$availableAccounts, $draft],
  source: { draft: $draft, accounts: walletModel.$availableAccounts },
  filter: ({ draft, accounts }) => nonNullable(draft) && nonNullable(findSubmittableInitiator(draft, accounts)),
  fn: ({ draft, accounts }) => findSubmittableInitiator(draft!, accounts),
  target: $signatory,
});

// --- Confirm model ---

const confirmStore = createExtrinsicConfirmStore<ConfirmInput>({
  wallets: walletModel.$wallets,
});

const confirmModel = {
  $confirms: confirmStore.$confirms,
  init: confirmStore.init,
  startSigning: confirmStore.startSigning,
};

// The confirm store is only ever written by `init`, so without this it still holds the
// previous flow's item when the next one opens: the confirm screen would render the
// last draft's account, fee and call args, and — now that `$confirms` is a readiness
// requirement — the flow would report `ready` off that stale item instead of waiting.
// Declared above the `confirmModel.init` sample so the reset lands first when
// `flowStarted` fans out.
sample({
  clock: flowStarted,
  target: confirmStore.resetConfirm,
});

// --- Readiness of the confirm screen ---

// Tier 1 blocks: answers we already know without waiting for any RPC.
//
// `network-disabled` MUST come from the connection type, NOT from
// `$connectionStatuses`. `ConnectionStatus.DISCONNECTED` is both the initial value
// for every chain (`network-model.ts:65` seeds the whole dictionary with it) and
// the state after a socket drop (`:381`). Reading it here would claim "this network
// is turned off" for a healthy chain that simply has not finished connecting yet,
// and would hijack a genuine disconnect into the settings-page remediation instead
// of retry/change-node. Only `connectionType === DISABLED` means the user turned it
// off, and `networkUtils.isDisabledConnection` is the canonical check.
//
// Everything else — CONNECTING, DISCONNECTED, ERROR on an *enabled* chain — is
// deliberately NOT a tier-1 block. It resolves itself on reconnect, or falls through
// to the tier-3 timeout, which reports `network-unreachable` with the right actions.
const $networkBlock = combine(
  { chain: $chain, connections: networkModel.$connections },
  ({ chain, connections }): OperationBlockReason | null => {
    if (nullable(chain)) return null;

    const connection = connections[chain.chainId];

    return nonNullable(connection) && networkUtils.isDisabledConnection(connection)
      ? { kind: 'network-disabled' }
      : null;
  },
);

// Both path-and-call-data blocks derive from `$wrappedTxErrorKind` so the
// readiness verdict and the transaction gate (`$transactionToWrap`) can never
// disagree about *why* the transaction was withheld. The missing account rides
// along so the blocked screen can name it instead of saying "unresolvable".
const $pathBlock = combine(
  { kind: $wrappedTxErrorKind, accountId: $pathMissingAccountId },
  ({ kind, accountId }): OperationBlockReason | null => {
    if (kind === 'signing-path-missing') return { kind };
    if (kind === 'signing-path-unresolved') return accountId ? { kind, accountId } : { kind };

    return null;
  },
);

const $callDataBlock = $wrappedTxErrorKind.map((kind): OperationBlockReason | null =>
  kind === 'extrinsic' ? { kind: 'invalid-call-data' } : null,
);

// One block per step. A missing signatory comes first: with nothing selected the
// confirm item can't exist, so a dropped item is only meaningful once a signatory
// was picked. Gate the drop on BOTH stores: a non-null `$dropped` does not imply
// `$confirms` is empty — with several items one can drop while another stays
// usable, and blocking on `$dropped` alone would hide a working confirm screen.
// (Every call site inits a single item today, so this is defensive.)
const $confirmingBlock = combine(
  {
    signatories: $signatories,
    signatory: $signatoryStore,
    dropped: confirmStore.$dropped,
    confirms: confirmStore.$confirms,
  },
  ({ signatories, signatory, dropped, confirms }): OperationBlockReason | null => {
    if (nullable(signatory) && signatories.length > 0) return { kind: 'no-signatory' };
    if (nonNullable(dropped) && confirms.length === 0) return { kind: 'internal', detail: dropped };

    return null;
  },
);

// The factory is pure and cannot read connection status itself.
//
// A CONNECTED chain that still hasn't answered after the full deadline is the
// throttling signature: the node accepted the socket and then went quiet. That is
// `node-unresponsive`, whose remediation leads with "change node" — the only thing
// that actually helps. It must not fold into `internal` ("reload app", which throws
// the session away and does not address the cause) nor into `network-unreachable`
// (the socket is up). Tier 2 reaches the same conclusion once WsProvider's own
// pending-request timeout rejects at t≈60s; this gets there 45 seconds sooner.
const $timeoutReason = combine(
  { chain: $chain, statuses: networkModel.$connectionStatuses },
  ({ chain, statuses }): OperationBlockReason => {
    const status = nonNullable(chain) ? statuses[chain.chainId] : null;

    return status === ConnectionStatus.CONNECTED ? { kind: 'node-unresponsive' } : { kind: 'network-unreachable' };
  },
);

const $confirmReady = confirmModel.$confirms.map((confirms) => confirms.at(0) ?? null);

// Validation reads balances that arrive over the same node as everything else, so
// when the node goes quiet it never reaches a verdict at all: `$validationDone`
// stays false, the Sign button stays disabled with `$validationPending` false, and
// nothing on screen explains why. Folding it into readiness gives that dead end the
// same tier-3 timeout treatment as the rest of the flow.
//
// Null means "no verdict yet"; `true` covers both a clean pass and a validation that
// finished with real errors — those belong inline on the confirm screen via
// `TransactionValidationError`, never as a block.
const $validationSettled = $validationDone.map((done) => (done ? true : null));

// A plain store, NOT `$step.map(...)`. The factory uses `active` as a `sample`
// clock, and a derived store used as a clock does not emit under `fork()` —
// the readiness timers would silently never arm in tests. `stepChanged` is an
// event, so clocking on it is safe.
const $confirmActive = createStore(false);

sample({
  clock: stepChanged,
  fn: (step) => step === Step.CONFIRM,
  target: $confirmActive,
});

const { $readiness, retryRequested } = createOperationReadiness({
  active: $confirmActive,
  timeoutReason: $timeoutReason,
  requirements: [
    { key: 'connecting', store: $api, blocked: $networkBlock },
    { key: 'resolving-path', store: $initiator, blocked: $pathBlock },
    { key: 'wrapping', store: $wrappedTx, error: $wrappedTxFailure, blocked: $callDataBlock, retry: retryWrappedTx },
    { key: 'estimating-fee', store: $fee, error: $feeFailure, retry: retryFee },
    { key: 'confirming', store: $confirmReady, blocked: $confirmingBlock },
    // Last on purpose. Order only decides the reported `pending.step` and the
    // tier-1 scan order, and this requirement declares no `blocked` store at all;
    // validation is the habitual laggard because it waits on balances, so naming
    // it only once everything else is satisfied is the informative choice.
    { key: 'validating', store: $validationSettled, error: $validationFailure, retry: retryValidation },
  ],
});

// The socket can come back on its own while the user reads the error — `$apis`
// keeps the same api object across a reconnect, so only the call needs repeating.
//
// Gated on the flow being blocked *by the network*. `providerReconnected` only passes
// when the status is not CONNECTED/CONNECTING and `autoConnectMs` is 5000, so a
// flapping testnet emits a CONNECTED every 5-10s; retrying on each one re-arms both
// readiness timers (resetting `$timedOut`), so the tier-3 backstop could be postponed
// forever while the screen oscillated between blocked and spinner and the app
// hammered a throttled node. A *pending* flow needs no rescue — it is already waiting
// and its own timers are running — and a local verdict (no signatory, unusable path,
// disabled chain) has nothing to gain from a reconnect but the same flicker.
//
// Reading `$readiness` in `source` while targeting `retryRequested`, which feeds the
// readiness factory, is not a cycle: `source` is sampled, never a clock, so the
// resulting recomputation of `$readiness` does not re-fire this sample.
sample({
  clock: networkModel.output.connectionStatusChanged,
  source: { chain: $chain, step: $step, readiness: $readiness },
  filter: ({ chain, step, readiness }, { chainId, status }) =>
    step === Step.CONFIRM &&
    readiness.status === 'blocked' &&
    isNetworkBlockReason(readiness.reason) &&
    nonNullable(chain) &&
    chain.chainId === chainId &&
    status === ConnectionStatus.CONNECTED,
  target: retryRequested,
});

// --- Diagnostics ---

// The original report of this flow hanging came with nothing but the reporter's
// console, so the blocked verdict — kind plus the raw `detail` threaded through the
// taxonomy — is logged there. `detail` is deliberately console-only: it is
// untranslated and can carry an endpoint URL, so it never reaches the UI.
const logReadinessTransitionFx = createEffect((readiness: OperationReadiness) => {
  if (readiness.status !== 'blocked') return;

  const { kind, detail } = readiness.reason;
  console.error(`[submit-draft] readiness blocked: ${kind}${detail ? ` — ${detail}` : ''}`);
});

// Effector dedupes store updates by reference, which is not enough here: blocked
// verdicts are fresh objects on every recompute, and tier 2 re-runs
// `classifyRpcError` each time, so any unrelated upstream update while the flow
// stays blocked would re-emit an identical reason. Log on the transition only,
// keyed by the verdict's content; clearing on recovery lets a later re-block speak up.
//
// Clocked on `$readiness` itself (a `combine`, not a `.map`) — see the note on
// `$confirmActive` for why a mapped store must not be a clock here.
const getBlockSignature = (readiness: OperationReadiness) =>
  readiness.status === 'blocked' ? `${readiness.reason.kind}|${readiness.reason.detail ?? ''}` : null;

const $loggedBlockSignature = createStore<string | null>(null, { serialize: 'ignore' });

sample({
  clock: $readiness,
  source: $loggedBlockSignature,
  filter: (logged, readiness) => getBlockSignature(readiness) !== logged,
  fn: (_, readiness) => readiness,
  target: logReadinessTransitionFx,
});

$loggedBlockSignature.on(logReadinessTransitionFx, (_, readiness) => getBlockSignature(readiness));

// --- Flow lifecycle ---

sample({
  clock: flowStarted,
  fn: ({ draft }) => draft,
  target: $draft,
});

sample({
  clock: flowStarted,
  fn: ({ chain }) => chain,
  target: $chain,
});

sample({
  clock: flowStarted,
  fn: ({ initiator }) => initiator,
  target: $flowInitiator,
});

sample({
  clock: flowStarted,
  fn: ({ displayInitiator, initiator }) => displayInitiator ?? initiator,
  target: $displayInitiator,
});

sample({
  clock: flowStarted,
  fn: ({ draft }) => (draft.callData ? Step.CONFIRM : Step.CALL_DATA),
  target: stepChanged,
});

sample({
  clock: submitCallDataFx.doneData,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

// Tell the multisig description aggregate that a draft submission is in
// progress, so it hides its description input (drafts carry their own
// description) and skips its post-submit hook.
sample({
  clock: flowStarted,
  fn: () => true,
  target: multisigOperationDescription.setDraftFlowActive,
});

sample({
  clock: flowFinished,
  fn: () => false,
  target: multisigOperationDescription.setDraftFlowActive,
});

// Auto-select signatory when only one option — but never overwrite an
// already-chosen one. Without this guard, an auto-select fired by a later
// `$signatories` recomputation would clobber the path-driven pre-selection
// (e.g. for nested multisigs where the wallet exposes the root multisig as a
// "leaf" because no children-pipeline handler is registered).
sample({
  clock: $signatories,
  source: $signatoryStore,
  filter: (current, signatories) => current === null && signatories.length === 1,
  fn: (_, signatories) => signatories.at(0) ?? null,
  target: $signatory,
});

// --- Step transitions ---

// Both `startSigning` consumers are gated on the recipient acknowledgement,
// so the Sign button's `disabled` is not the only thing standing in the way.
sample({
  clock: confirmModel.startSigning,
  filter: $recipientRiskAccepted,
  fn: () => Step.SIGN,
  target: stepChanged,
});

sample({
  clock: signModel.signed,
  source: $step,
  filter: (step) => step !== Step.NONE,
  fn: () => Step.SUBMIT,
  target: stepChanged,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

// --- Confirm → Sign → Submit ---

// When wrappedTx + fee are ready and step is CONFIRM, auto-init confirm.
// `$signatoryStore` is in `clock` so init re-fires when auto-/pre-selection
// resolves the signatory after fee/wrappedTx have already settled — without
// it the previous fallback (`signatory || initiator`) used to mask the gap.
sample({
  clock: [flowStarted, $wrappedTx, $fee, $signatoryStore],
  source: {
    draft: $draft,
    wrappedTx: $wrappedTx,
    fee: $fee,
    api: $api,
    chain: $chain,
    initiator: $initiator,
    displayInitiator: $displayInitiator,
    signatory: $signatoryStore,
    route: $route,
    pathError: $pathResolutionError,
  },
  // `!pathError` is the backstop for the whole "sign only along the saved
  // path" rule: whatever leaks through the stores upstream, the confirm step
  // never opens while an account on the path is missing, so there is no screen
  // from which the draft could be signed.
  filter: (s) =>
    !s.pathError &&
    nonNullable(s.draft) &&
    nonNullable(s.wrappedTx) &&
    nonNullable(s.fee) &&
    nonNullable(s.api) &&
    nonNullable(s.chain) &&
    nonNullable(s.initiator) &&
    nonNullable(s.signatory),
  fn: (s) => {
    const uiInitiator = s.displayInitiator ?? s.initiator!;
    const signatory = s.signatory!;

    return [
      {
        api: s.api!,
        chain: s.chain!,
        transaction: s.wrappedTx!,
        initiator: uiInitiator,
        signatory,
        route: s.route.length > 0 ? s.route : [signatory],
        fee: s.fee!,
        draft: s.draft!,
      },
    ] satisfies ConfirmInput[];
  },
  target: confirmModel.init,
});

// SIGN step → pass signing payload to signModel
const sign = sample({
  clock: confirmModel.startSigning,
  source: {
    wrappedTx: $wrappedTx,
    api: $api,
    chain: $chain,
    signatory: $signatoryStore,
  },
  filter: $recipientRiskAccepted,
  fn({ wrappedTx, api, chain, signatory }) {
    if (nullable(api) || nullable(wrappedTx) || nullable(chain) || nullable(signatory)) return null;

    return {
      transaction: wrappedTx,
      signatory,
      chain,
      api,
    } satisfies TransactionSigningPayload;
  },
});

sample({
  clock: sign.filter({ fn: nonNullable }),
  fn: (payload) => [payload],
  target: signModel.init,
});

// signed → submit
sample({
  clock: signModel.signed,
  source: $step,
  filter: (step) => step !== Step.NONE,
  fn: (_, payload) => payload,
  target: submitModel.init,
});

// --- Post-submit: create operation description ---

const postSubmitFx = createEffect(
  async ({
    draft,
    initiator,
    callHash,
    timepoint,
    baseUrl,
  }: {
    draft: Draft;
    initiator: AnyAccount;
    callHash: string;
    timepoint: { height: number; index: number };
    baseUrl: string;
  }) => {
    // `draft.multisigAccountId` is guaranteed by the caller (DraftsSection
    // refuses to submit without it). The `?? initiator.accountId` fallback is
    // a last-resort safety net — note that for flex drafts `initiator` is now
    // the resolved `FlexibleMultisigAccount` whose `accountId` is the *pure
    // proxied* accountId, not the inner multisig. The fallback path is only
    // reachable if a future caller bypasses the entrypoint guard.
    await operationsService.createDescription(baseUrl, {
      multisigAccountId: draft.multisigAccountId ?? initiator.accountId,
      chainId: draft.chainId,
      callHash,
      blockNumber: timepoint.height,
      extrinsicIndex: timepoint.index,
      description: draft.description ?? '',
      draftId: draft.id,
    });

    const multisigAccountId = draft.multisigAccountId ?? initiator.accountId;
    const operationId = `${draft.chainId}-${callHash}-${multisigAccountId}-${timepoint.height}-${timepoint.index}`;

    return { operationId, description: draft.description ?? '', draftId: draft.id };
  },
);

sample({
  clock: submitModel.done,
  source: {
    draft: $draft,
    chain: $chain,
    initiator: $initiator,
    wrappedExtrinsic: $wrappedExtrinsic,
    api: $api,
    baseUrl: backendConfigurationModel.$backendUrl,
  },
  filter: (s, results) => {
    const hasSuccess = results.some((r) => r.result === ExtrinsicResult.SUCCESS);

    return hasSuccess && nonNullable(s.draft) && nonNullable(s.chain) && nonNullable(s.baseUrl);
  },
  fn: (s, results) => {
    const successResult = results.find((r) => r.result === ExtrinsicResult.SUCCESS) as SuccessResult;
    const timepoint = successResult.params.timepoint;

    // The multisig event records the hash of as_multi's `call` argument — i.e.
    // the multisig's *child* call. For plain multisig drafts that's the bare
    // call data; for flex/proxy drafts that's `proxy.proxy(real, callData)`.
    // Find the child via the wrapped extrinsic so flex matches correctly.
    let callHash = '';
    if (s.wrappedExtrinsic && s.api) {
      try {
        const innerCall = multisigOperationService.findInnerExtrinsicCall(s.wrappedExtrinsic);
        if (innerCall) {
          callHash = innerCall.hash.toHex();
        } else {
          callHash = s.api.createType('Call', s.draft!.callData).hash.toHex();
        }
      } catch {
        callHash = successResult.params.extrinsicHash;
      }
    }

    return {
      draft: s.draft!,
      initiator: s.initiator!,
      callHash,
      timepoint,
      baseUrl: s.baseUrl!,
    };
  },
  target: postSubmitFx,
});

sample({
  clock: postSubmitFx.doneData,
  fn: ({ operationId, description, draftId }) => ({ id: operationId, description, draftId }),
  target: operationDescriptionsResource.descriptionCreated,
});

// --- Post-submit success toast ---

const showSubmitSuccessToastFx = createEffect(() => {
  toast.success(t('operations.drafts.submitSuccess'));
});

sample({
  clock: submitModel.done,
  source: $draft,
  filter: (draft, results) => nonNullable(draft) && results.some((r) => r.result === ExtrinsicResult.SUCCESS),
  fn: (draft) => draft!.id,
  target: showSubmitSuccessToastFx,
});

// --- Session-only: track drafts submitted this session (show "Submitted" badge until backend confirms) ---

const $submittedDraftIds = createStore<Set<string>>(new Set());

sample({
  clock: submitModel.done,
  source: { draft: $draft, current: $submittedDraftIds },
  filter: ({ draft }, results) => nonNullable(draft) && results.some((r) => r.result === ExtrinsicResult.SUCCESS),
  fn: ({ draft, current }) => new Set([...current, draft!.id]),
  target: $submittedDraftIds,
});

// --- Post-submit sync error: toast with retry ---

const showSyncErrorToastFx = createEffect(
  (params: {
    draft: Draft;
    initiator: AnyAccount;
    callHash: string;
    timepoint: { height: number; index: number };
    baseUrl: string;
  }) => {
    toast.error(t('operations.drafts.syncError'), {
      action: {
        label: t('operations.drafts.syncRetry'),
        onClick: () => postSubmitFx(params),
      },
    });
  },
);

sample({
  clock: postSubmitFx.fail,
  fn: ({ params }) => params,
  target: showSyncErrorToastFx,
});

// Remove draft from submitted set on sync failure so it stays visible and retryable
sample({
  clock: postSubmitFx.fail,
  source: $submittedDraftIds,
  fn: (current, { params }) => {
    const next = new Set(current);
    next.delete(params.draft.id);

    return next;
  },
  target: $submittedDraftIds,
});

// --- Exports ---

export const submitDraftModel = {
  $step,
  $draft,
  $chain,
  $initiator,
  $signatoryStore,
  $signatories,
  $fee,
  $wrappedTx,
  $wrappedExtrinsic,
  $wrappedTxError,
  $wrappedTxErrorKind,
  $route,
  $pathResolutionError,
  $pathMissingAccountId,
  $submittedDraftIds,
  $multisigThreshold,
  $multisigDeposit,
  $multisigDepositPending,
  $validationErrors,
  $validationValid,
  $validationPending,
  $validationDone,
  $pendingCallData,
  $pendingCallDataDecoded,
  $pendingCallDataError,
  $canConfirmCallData,
  $destinationAccountId,
  $recipientWarning,
  $isRiskAcknowledged,
  $recipientRiskAccepted,
  $savingCallData: submitCallDataFx.pending,
  $readiness,
  retryReadiness: retryRequested,

  flowStarted,
  flowFinished,
  signatoryChanged: $signatory,
  callDataChanged,
  callDataConfirmRequested,
  riskAcknowledgedToggled,

  confirmModel,

  Step,

  __test: {
    $pathRoute,
    $flowInitiator,
  },
};
