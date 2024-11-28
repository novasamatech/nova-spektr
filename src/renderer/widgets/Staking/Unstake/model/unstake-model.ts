import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type BasketTransaction, type Transaction } from '@/shared/core';
import { getRelaychainAsset, nonNullable } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { basketModel } from '@/entities/basket';
import { walletModel, walletUtils } from '@/entities/wallet';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { unstakeConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStore, Step, type UnstakeStore } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $unstakeStore = createStore<UnstakeStore | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $wrappedTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $multisigTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $coreTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    store: $unstakeStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.shards[0].walletId);
  },
  { skipVoid: false },
);

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
  fn: ({ transactions, formData }) => {
    const wrappedTxs = transactions.map((tx) => tx.wrappedTx);
    const multisigTxs = transactions.map((tx) => tx.multisigTx).filter(nonNullable);
    const coreTxs = transactions.map((tx) => tx.coreTx);

    return {
      wrappedTxs,
      coreTxs,
      multisigTxs: multisigTxs.length === 0 ? null : multisigTxs,
      unstakeStore: formData,
    };
  },
  target: spread({
    wrappedTxs: $wrappedTxs,
    multisigTxs: $multisigTxs,
    coreTxs: $coreTxs,
    unstakeStore: $unstakeStore,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: { networkStore: $networkStore, coreTxs: $coreTxs },
  filter: ({ networkStore }) => Boolean(networkStore),
  fn: ({ networkStore, coreTxs }, { formData }) => ({
    event: [
      {
        ...formData,
        chain: networkStore!.chain,
        asset: getRelaychainAsset(networkStore!.chain.assets)!,
        coreTx: coreTxs![0],
      },
    ],
    step: Step.CONFIRM,
  }),
  target: spread({
    event: confirmModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.output.formSubmitted,
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
        account: unstakeStore!.shards[index],
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
    multisigTxs: $multisigTxs,
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
      account: transferData.unstakeStore!.shards[0],
      signatory: transferData.unstakeStore!.signatory,
      wrappedTxs: transferData.wrappedTxs!,
      coreTxs: transferData.coreTxs!,
      multisigTxs: transferData.multisigTxs || [],
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
    store: $unstakeStore,
    coreTxs: $coreTxs,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ store, coreTxs, txWrappers }) => {
    return Boolean(store) && Boolean(coreTxs) && Boolean(txWrappers);
  },
  fn: ({ store, coreTxs, txWrappers }) => {
    const txs = coreTxs!.map(
      (coreTx) =>
        ({
          initiatorWallet: store!.shards[0].walletId,
          coreTx,
          txWrappers,
          groupId: Date.now(),
        }) as BasketTransaction,
    );

    return txs;
  },
  target: basketModel.events.transactionsCreated,
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
