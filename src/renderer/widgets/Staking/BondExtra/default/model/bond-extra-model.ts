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
import { type BondExtraConfirm, bondExtraConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { Step, type WalletDataShards } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<WalletDataShards>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $walletDataShards = restore<WalletDataShards | null>(flowStarted, null).reset(flowFinished);
const $walletData = $walletDataShards.map((data) => {
  if (!data) return null;

  return {
    initiator: data.shards[0],
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
  ({ apis, walletData }) => (walletData ? apis[walletData.chain.chainId] : null),
);

sample({
  clock: formModel.$txWrappers,
  source: $api,
  filter: (api, txWrappers) => nonNullable(api) && transactionService.hasMultisig(txWrappers),
  fn: (api, txWrappers) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.MULTISIG) as MultisigTxWrapper;

    return {
      api: api!,
      threshold: wrapper?.multisigAccount.threshold || 0,
    };
  },
  target: getMultisigDepositFx,
});

// Steps

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  fn: (data) => ({
    initiator: data.shards[0],
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

sample({
  clock: formModel.output.formSubmitted,
  source: {
    formParams: formModel.form.$values,
    fee: formModel.$fee,
    multisigDeposit: formModel.$multisigDeposit,
    walletData: $walletData,
    coreTx: formModel.$coreTx,
    tx: formModel.$tx,
    route: formModel.$route,
    multisigTx: formModel.$multisigTx,
  },
  filter: ({ formParams, walletData, tx, route, coreTx }) =>
    nonNullable(formParams) &&
    nonNullable(walletData) &&
    nonNullable(formParams?.initiator) &&
    nonNullable(tx) &&
    nonNullable(route) &&
    nonNullable(coreTx),
  fn: ({ formParams, fee, multisigDeposit, walletData, coreTx, tx, route, multisigTx }) => {
    return {
      event: [
        {
          ...formParams!,
          initiator: formParams!.initiator!,
          signatory: formParams!.signatory!,
          fee: fee.toString(),
          totalFee: fee.toString(),
          multisigDeposit,
          chain: walletData!.chain,
          asset: getRelaychainAsset(walletData!.chain.assets)!,
          tx: tx!,
          coreTx: coreTx!,
          route,
          multisigTx: multisigTx,
        } satisfies BondExtraConfirm,
      ],
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigning,
  source: {
    formParams: formModel.form.$values,
    walletData: $walletData,
    transaction: formModel.$tx,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ formParams, walletData, transaction }) => {
    return (
      nonNullable(formParams) &&
      nonNullable(walletData) &&
      nonNullable(transaction) &&
      nonNullable(formParams?.initiator)
    );
  },
  fn: ({ formParams, walletData, transaction, txWrappers }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        signingPayloads: [
          {
            chain: walletData!.chain,
            account: wrapper ? wrapper.proxyAccount : formParams!.initiator!,
            signatory: formParams!.signatory,
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
    formParams: formModel.form.$values,
    walletData: $walletData,
    tx: formModel.$tx,
    coreTx: formModel.$coreTx,
    multisigTx: formModel.$multisigTx,
  },
  filter: ({ formParams, walletData, tx, coreTx }) => {
    return (
      nonNullable(formParams) &&
      nonNullable(walletData) &&
      nonNullable(tx) &&
      nonNullable(coreTx) &&
      nonNullable(formParams?.initiator) &&
      nonNullable(formParams?.signatory) &&
      nonNullable(coreTx)
    );
  },
  fn: ({ formParams, walletData, tx, coreTx, multisigTx }, signParams) => {
    return {
      event: {
        ...signParams,
        chain: walletData!.chain,
        account: formParams.initiator!,
        signatory: formParams.signatory!,
        coreTxs: [coreTx!],
        wrappedTxs: [tx!],
        multisigTxs: [multisigTx!],
      },
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
    store: $walletData,
    coreTx: formModel.$coreTx,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ store, coreTx, txWrappers }) => {
    return nonNullable(store) && nonNullable(coreTx) && nonNullable(txWrappers) && nonNullable(store?.initiator);
  },
  fn: ({ store, coreTx, txWrappers }) => {
    if (!store || !coreTx || !store.initiator) return [];

    return [{ initiatorAccountId: store.initiator!.accountId, coreTx, txWrappers, createdAt: Date.now() }];
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
