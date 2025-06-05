import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type MultisigTxWrapper, type ProxyTxWrapper, WrapperKind } from '@/shared/core';
import { getRelaychainAsset, nonNullable } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { payeeConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type FeeData, type FormInput, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<FormInput>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $walletDataShards = restore<FormInput | null>(flowStarted, null).reset(flowFinished);
const $walletData = $walletDataShards.map((data) => ({
  wallet: data!.wallet,
  initiator: data!.shards[0],
  chain: data!.chain,
}));

const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });

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
  clock: formModel.$txWrappers,
  source: $api,
  filter: (api, txWrappers) => Boolean(api) && transactionService.hasMultisig(txWrappers),
  fn: (api, txWrappers) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.MULTISIG) as MultisigTxWrapper;

    return {
      api: api!,
      threshold: wrapper?.multisigAccount.threshold || 0,
    };
  },
  target: getMultisigDepositFx,
});

sample({
  clock: getMultisigDepositFx.doneData,
  source: $feeData,
  fn: (feeData, multisigDeposit) => ({ ...feeData, multisigDeposit }),
  target: $feeData,
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

sample({
  clock: formModel.output.formSubmitted,
  source: {
    payeeData: formModel.form.$values,
    feeData: $feeData,
    walletData: $walletData,
    txWrappers: formModel.$txWrappers,
    coreTx: formModel.$coreTx,
  },
  filter: ({ payeeData, walletData }) => Boolean(payeeData) && Boolean(walletData),
  fn: ({ payeeData, feeData, walletData, txWrappers, coreTx }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: [
        {
          chain: walletData!.chain,
          asset: getRelaychainAsset(walletData!.chain.assets)!,
          ...payeeData!,
          ...feeData,

          signatory: payeeData!.signatory!,
          shards: [payeeData!.initiator!],
          ...(wrapper && { proxiedAccount: wrapper.proxiedAccount }),
          ...(wrapper && { initiator: wrapper.proxyAccount }),
          coreTx,
        },
      ],
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.output.formSubmitted,
  source: {
    payeeData: formModel.form.$values,
    walletData: $walletData,
    transaction: formModel.$tx,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ payeeData, walletData, transaction }) => {
    return Boolean(payeeData) && Boolean(walletData) && Boolean(transaction);
  },
  fn: ({ payeeData, walletData, transaction, txWrappers }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        signingPayloads: [
          {
            chain: walletData!.chain,
            account: wrapper ? wrapper.proxyAccount : payeeData!.initiator!,
            signatory: payeeData!.signatory!,
            transaction: transaction!,
          },
        ],
      },
      step: Step.SIGN,
    };
  },
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    payeeData: formModel.form.$values,
    walletData: $walletData,
    transaction: formModel.$tx,
    coreTx: formModel.$coreTx,
    multisigTx: formModel.$multisigTx,
  },
  filter: ({ payeeData, walletData, transaction }) => {
    return Boolean(payeeData) && Boolean(walletData) && Boolean(transaction);
  },
  fn: (payeeFlowData, signParams) => ({
    event: {
      ...signParams,
      chain: payeeFlowData.walletData!.chain,
      account: payeeFlowData.payeeData!.initiator!,
      signatory: payeeFlowData.payeeData!.signatory!,
      coreTxs: [payeeFlowData.coreTx!],
      wrappedTxs: [payeeFlowData.transaction!],
      multisigTxs: [payeeFlowData.multisigTx!],
    },
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
    store: $walletData,
    coreTx: formModel.$coreTx,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ store, coreTx, txWrappers }) => {
    return Boolean(store) && Boolean(coreTx) && Boolean(txWrappers);
  },
  fn: ({ store, coreTx, txWrappers }) => {
    const account = store!.initiator;
    if (!account) throw new Error('Initiator account not found');

    return [
      {
        initiatorAccountId: account.accountId,
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
