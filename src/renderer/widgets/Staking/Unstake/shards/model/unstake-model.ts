import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Transaction } from '@/shared/core';
import { getRelaychainAsset, nonNullable } from '@/shared/lib/utils';
import { multisigOperationService } from '@/domains/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { unstakeConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStore, type UnstakeStore, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $unstakeStore = createStore<UnstakeStore | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $wrappedTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $coreTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    store: $unstakeStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.shards[0]!.walletId);
  },
  { skipVoid: false },
);

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
  fn: ({ transactions, formData }) => {
    const wrappedTxs = transactions.map((tx) => tx.wrappedTx);
    const coreTxs = transactions.map((tx) => tx.coreTx);

    return {
      wrappedTxs,
      coreTxs,
      unstakeStore: formData,
    };
  },
  target: spread({
    wrappedTxs: $wrappedTxs,
    coreTxs: $coreTxs,
    unstakeStore: $unstakeStore,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    networkStore: $networkStore,
    coreTxs: $coreTxs,
    api: formModel.$api,
  },
  filter: ({ networkStore, api, coreTxs }, { formData }) => {
    return nonNullable(formData) && nonNullable(coreTxs) && nonNullable(networkStore) && nonNullable(api);
  },
  fn: ({ networkStore, coreTxs, api }, { formData }) => ({
    event: [
      {
        ...formData,
        chain: networkStore!.chain,
        asset: getRelaychainAsset(networkStore!.chain.assets)!,
        coreTx: coreTxs![0]!,
        tx: coreTxs![0]!,
        api: api!,
        initiator: formData.shards[0]!,
        signatory: formData.signatory!,
        route: [formData.shards[0]!],
      },
    ],
    step: Step.CONFIRM,
  }),
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigning,
  source: {
    unstakeStore: $unstakeStore,
    networkStore: $networkStore,
    wrappedTxs: $wrappedTxs,
  },
  filter: ({ unstakeStore, networkStore, wrappedTxs }) => {
    return Boolean(unstakeStore) && Boolean(networkStore) && Boolean(wrappedTxs);
  },
  fn: ({ unstakeStore, networkStore, wrappedTxs }) => ({
    event: {
      signingPayloads: wrappedTxs!.map((tx, index) => ({
        chain: networkStore!.chain,
        account: unstakeStore!.shards[index]!,
        signatory: unstakeStore!.signatory,
        transaction: tx!,
      })),
    },
    step: Step.SIGN,
  }),
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    unstakeStore: $unstakeStore,
    networkStore: $networkStore,
    wrappedTxs: $wrappedTxs,
    coreTxs: $coreTxs,
  },
  filter: (transferData) => {
    return (
      Boolean(transferData.unstakeStore) &&
      Boolean(transferData.wrappedTxs) &&
      Boolean(transferData.coreTxs) &&
      Boolean(transferData.networkStore)
    );
  },
  fn: (transferData, signParams) => ({
    event: {
      ...signParams,
      chain: transferData.networkStore!.chain,
      account: transferData.unstakeStore!.shards[0]!,
      signatory: transferData.unstakeStore!.signatory,
      wrappedTxs: transferData.wrappedTxs!,
      coreTxs: transferData.coreTxs!,
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
  source: { isMultisig: formModel.$isMultisig, coreTx: $coreTxs, wrappedTx: $wrappedTxs },
  filter: ({ isMultisig }, results) => isMultisig && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ coreTx, wrappedTx }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx![0]!.chainId,
      callHash: wrappedTx![0]!.args.callHash,
      accountId: coreTx![0]!.accountId,
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

sample({
  clock: txSaved,
  source: $coreTxs,
  filter: nonNullable,
  fn: (coreTxs) => {
    return (coreTxs ?? []).map((coreTx) => ({
      initiatorAccountId: coreTx.accountId,
      coreTx,
      route: [],
      createdAt: Date.now(),
    }));
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const unstakeModel = {
  $step,
  $networkStore,
  $initiatorWallet,

  events: {
    flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
