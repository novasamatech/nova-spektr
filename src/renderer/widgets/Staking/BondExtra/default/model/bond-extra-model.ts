import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { getRelaychainAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SubmitInputDeprecated, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { type BondExtraConfirm, bondExtraConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { Step, type WalletDataShards } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<WalletDataShards>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $walletDataShards = restore<WalletDataShards | null>(flowStarted, null).reset(flowFinished);
const $walletData = $walletDataShards.map((data) => {
  if (!data) return null;

  return {
    initiator: data.shards[0]!,
    chain: data.chain,
    wallet: data.wallet,
  };
});

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

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
  },
}).filterMap(({ formParams, walletData, tx, route, coreTx, fee, multisigDeposit }) => {
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

const startSigningEvent = sample({
  clock: confirmModel.startSigning,
  source: {
    formParams: formModel.form.$values,
    walletData: $walletData,
    tx: formModel.$tx,
  },
}).filterMap(({ formParams: { initiator, signatory }, walletData, tx }) => {
  if (nonNullable(walletData) && nonNullable(tx) && nonNullable(initiator) && nonNullable(signatory)) {
    return [
      {
        chain: walletData.chain,
        account: initiator,
        signatory,
        transaction: tx,
      },
    ];
  }
});

sample({
  clock: startSigningEvent,
  fn: (signingPayloads) => ({
    event: {
      signingPayloads,
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
    tx: formModel.$tx,
    coreTx: formModel.$coreTx,
  },
  fn: (source, signParams) => ({ source, signParams }),
}).filterMap(({ signParams, source: { formParams, walletData, tx, coreTx } }) => {
  if (
    nonNullable(formParams) &&
    nonNullable(walletData) &&
    nonNullable(tx) &&
    nonNullable(coreTx) &&
    nonNullable(formParams.initiator) &&
    nonNullable(formParams.signatory) &&
    nonNullable(walletData.chain)
  ) {
    return {
      ...signParams,
      chain: walletData.chain,
      account: formParams.initiator,
      coreTxs: [coreTx],
      wrappedTxs: [tx],
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
  source: formModel.$isMultisig,
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0]!.result),
  fn: () => Paths.OPERATIONS,
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
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

export const bondExtraModel = {
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
