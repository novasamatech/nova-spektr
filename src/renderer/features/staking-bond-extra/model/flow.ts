import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { getRelaychainAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { getSigningPayloads } from '@/shared/transactions';
import { multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { basketOperations } from '@/aggregates/basket-operations';
import { wireDraftCloseRedirect } from '@/features/drafts';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import {
  type SubmitInputDeprecated,
  type SuccessResult,
  submitModel,
  submitUtils,
} from '@/features/operations/OperationSubmit';
import { type BondExtraConfirm, bondExtraConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStore, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $walletDataShards = restore<NetworkStore | null>(flowStarted, null).reset(flowFinished);
const $walletData = $walletDataShards.map((data) => {
  if (!data) return null;

  return {
    initiator: data.shards[0]!,
    chain: data.chain,
    wallet: data.wallet,
  };
});

const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

type DepositParams = {
  api: ApiPromise;
  threshold: number;
};
const getMultisigDepositFx = createEffect(({ api, threshold }: DepositParams): string => {
  return transactionService.getMultisigDeposit(threshold, api);
});

const $api = combine(
  {
    apis: networkModel.$apis,
    walletData: $walletData,
  },
  ({ apis, walletData }) => (walletData ? (apis[walletData.chain.chainId] ?? null) : null),
);

const requestMultisigDeposit = sample({
  clock: formModel.$multisigAccount,
  source: $api,
  fn: (api, account) => {
    if (nullable(api) || nullable(account)) return null;

    return {
      api,
      threshold: account.threshold,
    };
  },
}).updates.filterMap((params) => {
  if (params) {
    return params;
  }
});

sample({
  clock: requestMultisigDeposit,
  target: getMultisigDepositFx,
});

// Steps

sample({
  clock: flowStarted,
  fn: (data) => ({
    initiator: data.shards[0]!,
    chain: data.chain,
    wallet: data.wallet,
  }),
  target: formModel.events.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

const formSubmitted = sample({
  clock: formModel.output.formSubmitted,
  source: {
    formParams: formModel.form.$values,
    fee: formModel.$fee,
    multisigDeposit: formModel.$multisigDeposit,
    walletData: $walletData,
    coreTx: formModel.$coreTx,
    tx: formModel.$tx,
    route: formModel.$route,
    signingPath: formModel.$signingPath,
  },
}).filterMap(({ formParams, walletData, tx, route, coreTx, fee, multisigDeposit, signingPath }) => {
  if (
    nonNullable(formParams) &&
    nonNullable(walletData) &&
    nonNullable(formParams.initiator) &&
    nonNullable(tx) &&
    nonNullable(route) &&
    nonNullable(coreTx) &&
    nonNullable(fee) &&
    nonNullable(formParams.signatory)
  ) {
    return [
      {
        ...formParams,
        initiator: formParams.initiator,
        signatory: formParams.signatory,
        fee: fee.toString(),
        totalFee: fee.toString(),
        multisigDeposit: multisigDeposit.toString(),
        chain: walletData.chain,
        asset: getRelaychainAsset(walletData.chain.assets)!,
        tx: tx,
        coreTx: coreTx,
        route,
        signingPath,
      } satisfies BondExtraConfirm,
    ];
  }
});

sample({
  clock: formSubmitted,
  fn: (event) => {
    return {
      event,
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

// The open confirm step keeps up with the form's transaction (see `follow`).
confirmModel.follow({
  clock: formModel.$tx,
  $active: $step.map((step) => step === Step.CONFIRM),
  $transaction: combine({
    tx: formModel.$tx,
    coreTx: formModel.$coreTx,
    route: formModel.$route,
    signingPath: formModel.$signingPath,
  }),
});

sample({
  clock: confirmModel.confirmed,
  source: $walletData,
  filter: (walletData) => nonNullable(walletData),
  fn: (_, confirms) => ({
    event: {
      signingPayloads: getSigningPayloads(confirms),
    },
    step: Step.SIGN,
  }),
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

const submitEvent = sample({
  clock: signModel.output.formSubmitted,
  source: {
    formParams: formModel.form.$values,
    walletData: $walletData,
    confirms: confirmModel.$confirmed,
  },
  fn: (source, signParams) => ({ source, signParams }),
}).filterMap(({ signParams, source: { formParams, walletData, confirms } }) => {
  if (
    nonNullable(formParams) &&
    nonNullable(walletData) &&
    confirms.length > 0 &&
    nonNullable(formParams.initiator) &&
    nonNullable(formParams.signatory) &&
    nonNullable(walletData.chain)
  ) {
    return {
      ...signParams,
      chain: walletData.chain,
      account: formParams.initiator,
      coreTxs: confirms.map((confirm) => confirm.coreTx),
      wrappedTxs: confirms.map((confirm) => confirm.tx),
    } satisfies SubmitInputDeprecated;
  }
});

sample({
  clock: submitEvent,
  fn: (event) => ({
    event,
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { isMultisig: formModel.$isMultisig, confirms: confirmModel.$confirmed },
  filter: ({ isMultisig, confirms }, results) =>
    isMultisig && confirms.length > 0 && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ confirms }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;
    const { coreTx, tx } = confirms[0]!;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx.chainId,
      callHash: tx.args.callHash,
      multisigAccountId: coreTx.accountId,
      blockCreated: timepoint.height,
      indexCreated: timepoint.index,
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

wireDraftCloseRedirect({
  $initiatedDraft: formModel.$initiatedDraft,
  flowFinished,
  redirectTarget: $redirectAfterSubmitPath,
  destination: Paths.OPERATIONS,
});

sample({
  clock: txSaved,
  source: {
    coreTx: formModel.$coreTx,
    route: formModel.$route,
  },
  fn: ({ coreTx, route }) => {
    if (nullable(coreTx)) return [];

    return [
      {
        initiatorAccountId: coreTx.accountId,
        coreTx,
        route,
        createdAt: Date.now(),
      },
    ];
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const bondExtraFlow = {
  $step,
  $walletData,
  $initiatorWallet: $walletData.map((data) => data?.wallet || null),

  events: {
    flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
