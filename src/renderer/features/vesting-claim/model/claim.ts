import { type ApiPromise } from '@polkadot/api';
import { type BN, BN_ZERO } from '@polkadot/util';
import { attach, createEffect, createEvent, restore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Chain, type ChainId } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AnyAccount, accountService, accounts, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { getExtrinsic, transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
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

const claimStarted = createEvent<ClaimRequest[]>();
const flowFinished = createEvent();
const stepChanged = createEvent<Step>();

const $step = readonly(restore(stepChanged, Step.NONE));

type PrepareSource = {
  accountsList: AnyAccount[];
  availableAccounts: AnyAccount[];
  apis: Record<ChainId, ApiPromise>;
};

const prepareClaimsFx = createEffect(
  async ({ requests, source }: { requests: ClaimRequest[]; source: PrepareSource }): Promise<ClaimConfirm[]> => {
    const { accountsList, availableAccounts, apis } = source;
    const confirms: ClaimConfirm[] = [];

    for (const { chain, initiator, claimable, stillLocked } of requests) {
      const api = apis[chain.chainId];
      if (!api) continue;

      const signatory = accountService.findSignatories(initiator, availableAccounts, chain).at(0) ?? initiator;
      const route = accountService.findRoute(initiator, signatory, accountsList, chain);
      const effectiveRoute = route.length > 0 ? route : [initiator];
      const signer = effectiveRoute.at(-1) ?? initiator;

      const coreTx = transactionBuilder.buildVest({ chain, accountId: initiator.accountId });
      const tx = await transactionService.wrapLegacyTransaction(coreTx, effectiveRoute, api);
      tx.accountId = signer.accountId;

      const extrinsic = getExtrinsic[tx.type](tx.args, api);
      const signerAddress = toAddress(signer.accountId, { prefix: chain.addressPrefix });
      const { partialFee } = await extrinsic.paymentInfo(signerAddress);
      const fee = partialFee.toBn();
      const hasMultisigAccount = effectiveRoute.some((account) => accountUtils.isAnyMultisigAccount(account));

      confirms.push({
        chain,
        initiator,
        signatory: signer,
        route: effectiveRoute,
        tx,
        coreTx,
        fee: fee.toString(),
        claimable: claimable.toString(),
        stillLocked: stillLocked.toString(),
        hasMultisigAccount,
        multisigDeposit: BN_ZERO,
      });
    }

    return confirms;
  },
);

const prepareClaims = attach({
  source: {
    accountsList: accounts.$list,
    availableAccounts: walletModel.$availableAccounts,
    apis: networkModel.$apis,
  },
  mapParams: (requests: ClaimRequest[], source: PrepareSource) => ({ requests, source }),
  effect: prepareClaimsFx,
});

sample({
  clock: claimStarted,
  target: prepareClaims,
});

sample({
  clock: prepareClaimsFx.doneData,
  filter: (confirms) => confirms.length > 0,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

sample({
  clock: prepareClaimsFx.doneData,
  filter: (confirms) => confirms.length > 0,
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
  $step,
  $confirms,
  $preparing: prepareClaimsFx.pending,

  claimStarted,
  flowFinished,
  stepChanged,
};

export const claimUtils = {
  isNoneStep: (step: Step) => step === Step.NONE,
  isConfirmStep: (step: Step) => step === Step.CONFIRM,
  isSignStep: (step: Step) => step === Step.SIGN,
  isSubmitStep: (step: Step) => step === Step.SUBMIT,
};
