import { type BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Chain } from '@/shared/core';
import { getNativeAsset, nonNullable } from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createTxValidationStore,
  createTxValidator,
  getActionRequiredAmount,
} from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { createSigningPathModel } from '@/features/signing-path';
import { type ClaimConfirm, Step } from '../types';

import { confirmModel } from './confirm';
import { modalModel } from './modal-model';

/** A single account's claim, dispatched from the schedule UI. */
export type ClaimRequest = {
  chain: Chain;
  initiator: AnyAccount;
  claimable: BN;
  stillLocked: BN;
};

const claimStarted = createEvent<ClaimRequest>();
const flowFinished = createEvent();
const stepChanged = createEvent<Step>();

const $step = createStore(Step.NONE).on(stepChanged, (_, step) => step);

/**
 * The claim the user pressed on, snapshotted. The figures behind it keep moving
 * with every block; the one being signed must not.
 */
const $claim = createStore<ClaimRequest | null>(null)
  .on(claimStarted, (_, request) => request)
  .reset(flowFinished);

/**
 * The confirm opens on the click, not on the data.
 *
 * Everything it leads with — the amount unlocking, the amount that keeps
 * vesting, the account, the chain — is already in hand the moment the button is
 * pressed. The fee, the wrapped transaction and the validation each cost a
 * round trip to the node, and gating the modal on them meant staring at a dead
 * button for the length of three of them. They stream in behind their own
 * loaders instead, and the sign button stays disabled until they land.
 */
sample({
  clock: claimStarted,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

const $chain = $claim.map((claim) => claim?.chain ?? null);
const $initiator = $claim.map((claim) => claim?.initiator ?? null);
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

const $coreTx = combine($chain, $initiator, (chain, initiator) =>
  chain && initiator ? transactionBuilder.buildVest({ chain, accountId: initiator.accountId }) : null,
);

/**
 * Who signs the claim.
 *
 * A multisig or proxied initiator signs through the path — its leaf is the
 * signer. A **regular account signs for itself**, and for one the signing path
 * is empty by design (`pickDefaultPath` bails on any initiator that is neither
 * multisig nor proxied), so the path yields no signatory at all.
 *
 * Falling back to the initiator is therefore not a nicety: without it the route
 * comes out empty, the wrapping step throws "Signatory is required", and the
 * transaction — and with it the fee — is never built. The confirm then sits on
 * a fee spinner that never resolves, with no way to sign. Every other operation
 * form has the same fallback; this one derived its signatory purely from the
 * path.
 */
const $routeSignatory = combine($signatoryFromPath, $initiator, (fromPath, initiator) => fromPath ?? initiator);

// Wraps the call for the route, and re-estimates the fee whenever the route
// changes — switching signatory re-prices the claim against the new signer.
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
 * `vesting.vest()` moves nothing of its own, so there are no operation-specific
 * balance rules: the built-in checks are the whole story. They matter more here
 * than elsewhere, because a vesting account is exactly the kind that can fail
 * them — pallet_vesting's lock carries `WithdrawReasons::TRANSFER | RESERVE`,
 * so it blocks the multisig deposit outright, and a co-existing staking or
 * conviction-vote lock (those cover fees too) can leave nothing to pay with.
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
    claim: $claim,
    chain: $chain,
    initiator: $initiator,
    signatory: $signatory,
    route: $route,
    tx: $tx,
    coreTx: $coreTx,
  },
  ({ claim, chain, initiator, signatory, route, tx, coreTx }): ClaimConfirm | null => {
    if (!claim || !chain || !initiator || !signatory || !tx || !coreTx) return null;

    return {
      chain,
      initiator,
      signatory,
      route: route.length > 0 ? route : [initiator],
      tx,
      coreTx,
      claimable: claim.claimable.toString(),
      stillLocked: claim.stillLocked.toString(),
    };
  },
);

sample({
  clock: $confirmDraft,
  filter: nonNullable,
  fn: (confirm: ClaimConfirm) => [confirm],
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

sample({
  clock: signModel.signed,
  source: $step,
  filter: (step) => step !== Step.NONE,
  fn: (_, payload) => payload,
  target: submitModel.init,
});

sample({
  clock: signModel.signed,
  source: $step,
  filter: (step) => step !== Step.NONE,
  fn: () => Step.SUBMIT,
  target: stepChanged,
});

// A landed claim changes the on-chain state the account details modal presents,
// so close it on success. The schedules modal behind it updates on its own — the
// vesting schedules and locks are live subscriptions that refire when the claim
// (its dropped lock, its pruned schedule) lands on-chain.
sample({
  clock: submitModel.done,
  source: $step,
  filter: (step, results) =>
    step === Step.SUBMIT && results.some((result) => result.result === ExtrinsicResult.SUCCESS),
  fn: () => undefined,
  target: modalModel.accountClosed,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, confirmModel.resetConfirm],
});

export const claimModel = {
  $step: readonly($step),
  $confirms,
  $claim,
  $chain,
  $asset,
  $initiator,
  $signatory,
  // The hops the claim is wrapped through. Exposed because an empty route is the
  // one state in which nothing downstream — transaction, fee, signing — can be
  // built at all, and that failure is otherwise invisible.
  $route,
  $signingPath,
  $fee,
  $pendingFee,
  $errors,
  $hasMultisigAccount,
  $multisigDeposit,
  $preparing,
  $canSign,

  claimStarted,
  flowFinished,
  stepChanged,
  signingPathChanged,
};

export const claimUtils = {
  isNoneStep: (step: Step) => step === Step.NONE,
  isConfirmStep: (step: Step) => step === Step.CONFIRM,
  isSignStep: (step: Step) => step === Step.SIGN,
  isSubmitStep: (step: Step) => step === Step.SUBMIT,
};
