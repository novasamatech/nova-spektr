import { type ApiPromise } from '@polkadot/api';
import { type BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Asset, type Balance, type BalanceId, type Chain } from '@/shared/core';
import { getNativeAsset, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { createTxValidator, getActionRequiredAmount } from '@/shared/transactions';
import { type AnyAccount, transactionService } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { getExtrinsic, transactionBuilder } from '@/entities/transaction';
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

const $step = readonly(restore(stepChanged, Step.NONE));

/**
 * The claim the user pressed on, snapshotted. The figures behind it keep moving
 * with every block; the one being signed must not.
 */
const $claim = createStore<ClaimRequest | null>(null)
  .on(claimStarted, (_, request) => request)
  .reset(flowFinished);

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
const { $signingPath, signingPathChanged, $pathRoute } = createSigningPathModel({
  initiator: $initiator,
  chain: $chain,
  resetOn: flowFinished,
});

/**
 * `vesting.vest()` moves nothing of its own, so there are no operation-specific
 * balance rules: the built-in checks are the whole story. They matter more here
 * than elsewhere, because a vesting account is exactly the kind that can fail
 * them — pallet_vesting's lock carries `WithdrawReasons::TRANSFER | RESERVE`,
 * so it blocks the multisig deposit outright, and a co-existing staking or
 * conviction-vote lock (those cover fees too) can leave nothing to pay with.
 */
const validateClaim = createTxValidator();

type PrepareParams = {
  claim: ClaimRequest | null;
  route: AnyAccount[] | null;
  api: ApiPromise | null;
  asset: Asset | null;
  balances: Record<BalanceId, Balance>;
};

const prepareClaimFx = createEffect(
  async ({ claim, route, api, asset, balances }: PrepareParams): Promise<ClaimConfirm | null> => {
    if (nullable(claim) || nullable(api) || nullable(asset)) return null;

    const { chain, initiator, claimable, stillLocked } = claim;

    // `$pathRoute` is null for a trivial path — an account that signs for itself.
    const effectiveRoute = route && route.length > 0 ? route : [initiator];
    const signer = effectiveRoute.at(-1) ?? initiator;

    const coreTx = transactionBuilder.buildVest({ chain, accountId: initiator.accountId });
    const tx = await transactionService.wrapLegacyTransaction(coreTx, effectiveRoute, api);
    tx.accountId = signer.accountId;

    const extrinsic = getExtrinsic[tx.type](tx.args, api);
    const signerAddress = toAddress(signer.accountId, { prefix: chain.addressPrefix });
    const { partialFee } = await extrinsic.paymentInfo(signerAddress);

    const validation = await validateClaim({ api, asset, route: effectiveRoute, transaction: tx, balances });

    const multisigDeposit = getActionRequiredAmount(validation.balanceValidationResults, 'multisig deposit').reduce(
      (deposit, action) => deposit.add(action.required),
      BN_ZERO,
    );

    return {
      chain,
      initiator,
      signatory: signer,
      route: effectiveRoute,
      tx,
      coreTx,
      fee: partialFee.toBn().toString(),
      claimable: claimable.toString(),
      stillLocked: stillLocked.toString(),
      hasMultisigAccount: effectiveRoute.some((account) => accountUtils.isAnyMultisigAccount(account)),
      multisigDeposit,
      errors: validation.errors,
    };
  },
);

// Re-prepared whenever the route changes, so switching signatory re-wraps the
// transaction, re-estimates its fee and re-validates against the new signer's
// balance. Held to the steps where the confirm is still editable — `$pathRoute`
// also tracks the account list, and an account landing mid-signature must not
// swap the transaction out from under the sign step.
sample({
  clock: [$claim, $pathRoute],
  source: {
    claim: $claim,
    route: $pathRoute,
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    step: $step,
  },
  filter: ({ claim, step }) => nonNullable(claim) && (step === Step.NONE || step === Step.CONFIRM),
  fn: ({ claim, route, api, asset, balances }): PrepareParams => ({ claim, route, api, asset, balances }),
  target: prepareClaimFx,
});

sample({
  clock: prepareClaimFx.doneData,
  filter: nonNullable,
  fn: (confirm: ClaimConfirm) => [confirm],
  target: confirmModel.init,
});

sample({
  clock: prepareClaimFx.doneData,
  source: $step,
  filter: (step, confirm) => nonNullable(confirm) && step === Step.NONE,
  fn: () => Step.CONFIRM,
  target: stepChanged,
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
  $step,
  $confirms,
  $preparing: prepareClaimFx.pending,
  $chain,
  $asset,
  $signingPath,

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
