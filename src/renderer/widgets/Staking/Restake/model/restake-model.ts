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
import { restakeConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStore, type RestakeStore, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $restakeStore = createStore<RestakeStore | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $wrappedTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $multisigTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $coreTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    store: $restakeStore,
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
      store: formData,
    };
  },
  target: spread({
    wrappedTxs: $wrappedTxs,
    multisigTxs: $multisigTxs,
    coreTxs: $coreTxs,
    store: $restakeStore,
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
    restakeStore: $restakeStore,
    networkStore: $networkStore,
    wrappedTxs: $wrappedTxs,
  },
  filter: ({ restakeStore, networkStore, wrappedTxs }) => {
    return Boolean(restakeStore) && Boolean(networkStore) && Boolean(wrappedTxs);
  },
  fn: ({ restakeStore, networkStore, wrappedTxs }) => ({
    event: {
      signingPayloads: wrappedTxs!.map((tx, index) => ({
        chain: networkStore!.chain,
        account: restakeStore!.shards[index],
        signatory: restakeStore!.signatory,
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
    restakeStore: $restakeStore,
    networkStore: $networkStore,
    multisigTxs: $multisigTxs,
    wrappedTxs: $wrappedTxs,
    coreTxs: $coreTxs,
  },
  filter: (transferData) => {
    return (
      Boolean(transferData.restakeStore) &&
      Boolean(transferData.wrappedTxs) &&
      Boolean(transferData.coreTxs) &&
      Boolean(transferData.networkStore)
    );
  },
  fn: (transferData, signParams) => ({
    event: {
      ...signParams,
      chain: transferData.networkStore!.chain,
      account: transferData.restakeStore!.shards[0],
      signatory: transferData.restakeStore!.signatory,
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
    store: $restakeStore,
    coreTxs: $coreTxs,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ store, coreTxs, txWrappers }) => {
    return Boolean(store) && Boolean(coreTxs) && Boolean(txWrappers);
  },
  fn: ({ store, coreTxs, txWrappers }) => {
    return coreTxs!.map((coreTx) => {
      return {
        coreTx,
        txWrappers,
        groupId: Date.now(),
        initiatorWallet: store!.shards[0].walletId,
      } as BasketTransaction;
    });
  },
  target: basketModel.events.transactionsCreated,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const restakeModel = {
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
