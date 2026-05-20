import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { getRelaychainAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { basketOperations } from '@/aggregates/basket-operations';
import { wireDraftCloseRedirect } from '@/features/drafts';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { type PayeeConfirm, payeeConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type FormInput, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<FormInput>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $walletData = restore<FormInput | null>(flowStarted, null).reset(flowFinished);

const $multisigDeposit = createStore<string>('0');

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
  ({ apis, walletData }) => {
    return walletData ? (apis[walletData.chain.chainId] ?? null) : null;
  },
);

sample({
  clock: formModel.$multisigAccount,
  source: $api,
  filter: (api, multisigAccount) => nonNullable(api) && nonNullable(multisigAccount),
  fn: (api, multisigAccount) => {
    return {
      api: api!,
      threshold: multisigAccount!.threshold || 0,
    };
  },
  target: getMultisigDepositFx,
});

sample({
  clock: getMultisigDepositFx.doneData,
  target: $multisigDeposit,
});

// Steps

sample({
  clock: flowStarted,
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
    payeeData: formModel.form.$values,
    multisigDeposit: $multisigDeposit,
    walletData: $walletData,
    coreTx: formModel.$coreTx,
    route: formModel.$route,
    signingPath: formModel.$signingPath,
    tx: formModel.$tx,
    fee: formModel.$fee,
  },
}).filterMap(({ payeeData, multisigDeposit, walletData, coreTx, route, signingPath, tx, fee }) => {
  if (
    nonNullable(payeeData.initiator) &&
    nonNullable(payeeData.signatory) &&
    nonNullable(walletData) &&
    nonNullable(coreTx) &&
    nonNullable(fee) &&
    nonNullable(tx)
  ) {
    return [
      {
        ...payeeData,
        multisigDeposit,
        chain: walletData.chain,
        asset: getRelaychainAsset(walletData.chain.assets)!,
        signatory: payeeData.signatory,
        initiator: payeeData.initiator,
        route: route,
        signingPath,
        fee: fee.toString(),
        totalFee: fee.toString(),
        coreTx: coreTx,
        tx: tx,
      } satisfies PayeeConfirm,
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

const startSigning = sample({
  clock: confirmModel.startSigning,
  source: {
    payeeData: formModel.form.$values,
    walletData: $walletData,
    transaction: formModel.$tx,
  },
}).filterMap(({ payeeData, walletData, transaction }) => {
  if (
    nonNullable(payeeData.initiator) &&
    nonNullable(payeeData.signatory) &&
    nonNullable(walletData) &&
    nonNullable(transaction)
  ) {
    return [
      {
        chain: walletData.chain,
        account: payeeData.initiator,
        signatory: payeeData.signatory,
        transaction,
      },
    ];
  }
});

sample({
  clock: startSigning,
  fn: (signingPayloads) => {
    return {
      event: {
        signingPayloads,
      },
      step: Step.SIGN,
    };
  },
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

const signSubmitted = sample({
  clock: signModel.output.formSubmitted,
  source: {
    payeeData: formModel.form.$values,
    walletData: $walletData,
    transaction: formModel.$tx,
    coreTx: formModel.$coreTx,
  },
  fn: (source, signParams) => ({
    ...source,
    signParams,
  }),
}).filterMap(({ payeeData, walletData, transaction, coreTx, signParams }) => {
  if (
    nonNullable(payeeData.initiator) &&
    nonNullable(payeeData.signatory) &&
    nonNullable(walletData) &&
    nonNullable(transaction) &&
    nonNullable(coreTx)
  ) {
    return {
      ...signParams,
      chain: walletData.chain,
      account: payeeData.initiator,
      signatory: payeeData.signatory,
      coreTxs: [coreTx],
      wrappedTxs: [transaction],
    };
  }
});

sample({
  clock: signSubmitted,
  fn: (event) => {
    return {
      event,
      step: Step.SUBMIT,
    };
  },
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
  source: { isMultisig: formModel.$isMultisig, coreTx: formModel.$coreTx, wrappedTx: formModel.$tx },
  filter: ({ isMultisig }, results) => isMultisig && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ coreTx, wrappedTx }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx!.chainId,
      callHash: wrappedTx!.args.callHash,
      multisigAccountId: coreTx!.accountId,
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

export const payeeFlow = {
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
