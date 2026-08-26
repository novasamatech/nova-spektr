import { BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { getNativeAsset, nonNullable } from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createTxValidationStore,
  createTxValidator,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { accounts, multisigOperationService } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { multisigService } from '@/features/multisig-wallet';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign';
import { type SuccessResult, ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { createSigningPathModel } from '@/features/signing-path';
import { type UnlockConfirm, type UnlockRequest, Step } from '../types';

import { confirmModel } from './confirm';

const unlockRequested = createEvent<UnlockRequest>();
const flowFinished = createEvent();
/**
 * A landed extrinsic that actually released the lock. A multisig initiation
 * landing is not this — nothing is released until the remaining signatories
 * approve — so it does not fire this event. The host refreshes what it shows
 * off this.
 */
const flowCompleted = createEvent();
const stepChanged = createEvent<Step>();

const $step = createStore(Step.NONE).on(stepChanged, (_, step) => step);

/**
 * The release the user pressed on, snapshotted. Locks, referenda and the
 * claimable amount all keep moving with every block; the one being signed must
 * not.
 */
const $request = createStore<UnlockRequest | null>(null)
  .on(unlockRequested, (_, request) => request)
  .reset(flowFinished);

/**
 * The confirm opens on the click, not on the data.
 *
 * Everything it leads with — the amount released, the account it releases for,
 * the chain, the number of calls — is already in hand the moment the button is
 * pressed. The fee, the wrapped transaction and the validation each cost a
 * round trip to the node; they stream in behind their own loaders instead, and
 * the sign button stays disabled until they land.
 */
sample({
  clock: unlockRequested,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

const $chain = $request.map((request) => request?.chain ?? null);
const $initiator = $request.map((request) => request?.initiator ?? null);
const $asset = $chain.map((chain) => (chain ? (getNativeAsset(chain.assets) ?? null) : null));
const $api = combine(networkModel.$apis, $chain, (apis, chain) => (chain ? (apis[chain.chainId] ?? null) : null));

/**
 * The signing route: the initiator, plus any multisig/proxy hops between it and
 * an account that can actually sign.
 *
 * Seeded with the default path and overridable on the confirm screen. The
 * choice is load-bearing rather than cosmetic — the account at the end of the
 * route is the one that pays the fee and reserves the multisig deposit — so it
 * must not be made silently on the user's behalf when their wallet offers more
 * than one.
 */
const { $signingPath, signingPathChanged, $signatoryFromPath, $pathRoute } = createSigningPathModel({
  initiator: $initiator,
  chain: $chain,
  resetOn: flowFinished,
});

/**
 * `remove_vote` + `unlock`, batched when there is more than one. The initiator
 * is the origin of every call; `target` only parameterises `unlock`, which is
 * permissionless — anyone may release someone else's expired conviction lock.
 */
const $coreTx = $request.map((request) =>
  request
    ? transactionBuilder.buildUnlock({
        chain: request.chain,
        accountId: request.initiator.accountId,
        actions: request.actions,
        amount: request.amount.toString(),
        target: request.target,
      })
    : null,
);

/**
 * Who signs the release.
 *
 * A multisig or proxied initiator signs through the path — its leaf is the
 * signer. A **regular account signs for itself**, and for one the signing path
 * is empty by design (`pickDefaultPath` bails on any initiator that is neither
 * multisig nor proxied), so the path yields no signatory at all.
 *
 * Falling back to the initiator is therefore not a nicety: without it the route
 * comes out empty, the wrapping step throws "Signatory is required", and the
 * transaction — and with it the fee — is never built. The confirm then sits on
 * a fee spinner that never resolves, with no way to sign.
 */
const $routeSignatory = combine($signatoryFromPath, $initiator, (fromPath, initiator) => fromPath ?? initiator);

// Wraps the call for the route, and re-estimates the fee whenever the route
// changes — switching signatory re-prices the release against the new signer.
const { $route, $tx, $fee, $pendingFee, $pendingWrapping } = createComplexTxStore({
  api: $api,
  chain: $chain,
  transaction: $coreTx,
  accounts: accounts.$list,
  initiator: $initiator,
  signatory: $routeSignatory,
  routeOverride: $pathRoute,
});

const $signatory = combine($route, $initiator, (route, initiator) => route.at(-1) ?? initiator);

/**
 * A conviction release moves nothing of its own, so there are no
 * operation-specific balance rules: the built-in checks are the whole story.
 * They still matter — the very account being released is the one most likely to
 * have every spare planck locked, and `convictionVoting`'s lock covers the
 * multisig deposit.
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
  getActionRequiredAmount(results, 'multisig deposit').reduce(
    (deposit, action) => deposit.add(action.required),
    BN_ZERO,
  ),
);

/** Everything the node had to tell us has arrived, and it all checks out. */
const $canSign = combine(
  { tx: $tx, valid: $isTxValid, pendingFee: $pendingFee, pendingWrapping: $pendingWrapping, validating: $validating },
  ({ tx, valid, pendingFee, pendingWrapping, validating }) =>
    nonNullable(tx) && valid && !pendingFee && !pendingWrapping && !validating,
);

/** Any of the round trips the confirm is still waiting on. */
const $preparing = combine(
  { pendingFee: $pendingFee, pendingWrapping: $pendingWrapping, validating: $validating },
  ({ pendingFee, pendingWrapping, validating }) => pendingFee || pendingWrapping || validating,
);

// The confirm store is what the sign step reads, so it is (re)filled as soon as
// the wrapped transaction exists — and again whenever the route changes it.
const $confirmDraft = combine(
  {
    request: $request,
    chain: $chain,
    initiator: $initiator,
    signatory: $signatory,
    route: $route,
    tx: $tx,
    coreTx: $coreTx,
  },
  ({ request, chain, initiator, signatory, route, tx, coreTx }): UnlockConfirm | null => {
    if (!request || !chain || !initiator || !signatory || !tx || !coreTx) return null;

    return {
      chain,
      initiator,
      signatory,
      route: route.length > 0 ? route : [initiator],
      tx,
      coreTx,
      amount: request.amount.toString(),
      target: request.target,
      actionsCount: request.actions.length,
    };
  },
);

sample({
  clock: $confirmDraft,
  filter: nonNullable,
  fn: (confirm: UnlockConfirm) => [confirm],
  target: confirmModel.init,
});

sample({
  clock: confirmModel.startSigning,
  fn: () => Step.SIGN,
  target: stepChanged,
});

const $confirms = confirmModel.$confirms;

const sign = sample({
  clock: confirmModel.startSigning,
  source: $confirms,
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
// Only a flow that is *at* the sign step may claim the signature: a flow parked
// on CONFIRM (or abandoned there, with a Vault request still in flight
// elsewhere) would otherwise submit a foreign payload as its own.
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
 * A multisig initiator doesn't release anything yet — it opens a pending
 * operation the remaining signatories have to approve. Closing the flow on
 * something that looks like success would leave the user with no trace of it,
 * so the close navigates to that operation instead.
 */
const $redirectAfterSubmitPath = createStore<string | null>(null).reset(unlockRequested);

const findSuccessResult = (results: (SuccessResult | { result: ExtrinsicResult })[]) =>
  results.find((result): result is SuccessResult => result.result === ExtrinsicResult.SUCCESS) ?? null;

/**
 * What the multisig redirect link is built from.
 *
 * The multisig isn't necessarily the initiator — a proxied initiator's proxy
 * can itself be a multisig, in which case the multisig sits deeper in `$route`
 * and `$coreTx.accountId` is the proxied account, not the multisig. The
 * multisig account is therefore found in the route rather than assumed to be
 * the initiator, mirroring `remove-proxy-model.ts`'s `submitModel.done`
 * handling.
 */
const $multisigLinkParams = combine(
  { route: $route, coreTx: $coreTx, wrappedTx: $tx },
  ({ route, coreTx, wrappedTx }) => {
    const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);

    if (!multisigAccount || !coreTx || !wrappedTx) return null;

    return {
      chainId: coreTx.chainId,
      callHash: wrappedTx.args.callHash,
      multisigAccountId: multisigService.getMultisigAccountId(multisigAccount),
    };
  },
);

sample({
  clock: submitModel.done,
  source: { step: $step, linkParams: $multisigLinkParams },
  filter: ({ step, linkParams }, results) =>
    step === Step.SUBMIT && nonNullable(linkParams) && nonNullable(findSuccessResult(results)),
  fn: ({ linkParams }, results) => {
    const success = findSuccessResult(results);

    if (!linkParams || !success) return null;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: linkParams.chainId,
      callHash: linkParams.callHash,
      multisigAccountId: linkParams.multisigAccountId,
      blockCreated: success.params.timepoint.height,
      indexCreated: success.params.timepoint.index,
    });
  },
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

/**
 * A multisig initiation isn't a release — the extrinsic lands, but the funds
 * stay locked until the remaining signatories approve. Gated on
 * `$hasMultisigAccount` being false so `flowCompleted` only fires once the lock
 * is actually released.
 */
sample({
  clock: submitModel.done,
  source: { step: $step, hasMultisigAccount: $hasMultisigAccount },
  filter: ({ step, hasMultisigAccount }, results) =>
    step === Step.SUBMIT && !hasMultisigAccount && nonNullable(findSuccessResult(results)),
  fn: () => undefined,
  target: flowCompleted,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, confirmModel.resetConfirm],
});

export const unlockFlowModel = {
  $step: readonly($step),
  $request,
  $chain,
  $asset,
  $initiator,
  $signatory,
  // The hops the release is wrapped through. Exposed because an empty route is
  // the one state in which nothing downstream — transaction, fee, signing — can
  // be built at all, and that failure is otherwise invisible.
  $route,
  $coreTx,
  $signingPath,
  $fee,
  $pendingFee,
  $errors,
  $hasMultisigAccount,
  $multisigDeposit,
  $preparing,
  $canSign,

  unlockRequested,
  flowFinished,
  flowCompleted,
  stepChanged,
  signingPathChanged,
};

export const unlockFlowUtils = {
  isNoneStep: (step: Step) => step === Step.NONE,
  isConfirmStep: (step: Step) => step === Step.CONFIRM,
  isSignStep: (step: Step) => step === Step.SIGN,
  isSubmitStep: (step: Step) => step === Step.SUBMIT,
};
