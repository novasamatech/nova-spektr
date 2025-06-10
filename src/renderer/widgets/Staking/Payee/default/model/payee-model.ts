import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { getRelaychainAsset, nonNullable } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { type PayeeConfirm, payeeConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type FormInput, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<FormInput>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $walletData = restore<FormInput | null>(flowStarted, null).reset(flowFinished);

const $multisigDeposit = createStore<string>('0');

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
  ({ apis, walletData }) => {
    return walletData ? apis[walletData.chain.chainId] : null;
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

sample({ clock: stepChanged, target: $step });

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
    tx: formModel.$tx,
    fee: formModel.$fee,
    multisigTx: formModel.$multisigTx,
  },
}).filterMap(({ payeeData, multisigDeposit, walletData, coreTx, route, tx, multisigTx, fee }) => {
  if (
    nonNullable(payeeData.initiator) &&
    nonNullable(payeeData.signatory) &&
    nonNullable(walletData) &&
    nonNullable(coreTx) &&
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
        fee: fee.toString(),
        totalFee: fee.toString(),
        coreTx: coreTx,
        tx: tx,
        multisigTx: multisigTx,
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
    proxyAccount: formModel.$proxyAccount,
  },
}).filterMap(({ payeeData, walletData, transaction, proxyAccount }) => {
  if (
    nonNullable(payeeData.initiator) &&
    nonNullable(payeeData.signatory) &&
    nonNullable(walletData) &&
    nonNullable(transaction)
  ) {
    return [
      {
        chain: walletData.chain,
        account: proxyAccount || payeeData.initiator,
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
    multisigTx: formModel.$multisigTx,
  },
  fn: (source, signParams) => ({
    ...source,
    signParams,
  }),
}).filterMap(({ payeeData, walletData, transaction, coreTx, multisigTx, signParams }) => {
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
      multisigTxs: multisigTx ? [multisigTx] : [],
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
  source: formModel.$isMultisig,
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0].result),
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
    walletData: $walletData,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ coreTx, walletData, txWrappers }) => {
    return nonNullable(coreTx) && nonNullable(walletData) && nonNullable(txWrappers);
  },
  fn: ({ coreTx, walletData, txWrappers }) => {
    const account = walletData!.shards[0].accountId;
    if (!account) throw new Error('Initiator account not found');

    return [
      {
        initiatorAccountId: account,
        coreTx: coreTx!,
        txWrappers,
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

export const payeeModel = {
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
