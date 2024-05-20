import { createEvent, createStore, sample, restore, combine, createApi, attach } from 'effector';
import { spread, delay } from 'patronum';
import { NavigateFunction } from 'react-router-dom';

import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { Paths } from '@shared/routes';
import { Step, TransferStore, NetworkStore } from '../lib/types';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { transferUtils } from '../lib/transfer-utils';
import { BasketTransaction, Transaction } from '@shared/core';
import { basketModel } from '@entities/basket';
import { walletModel, walletUtils } from '@entities/wallet';

const $navigation = createStore<{ navigate: NavigateFunction } | null>(null);
const navigationApi = createApi($navigation, {
  navigateApiChanged: (state, { navigate }) => ({ ...state, navigate }),
});

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $transferStore = createStore<TransferStore | null>(null);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $wrappedTx = createStore<Transaction | null>(null);
const $multisigTx = createStore<Transaction | null>(null);
const $coreTx = createStore<Transaction | null>(null);

const $xcmChain = combine(
  {
    transferStore: $transferStore,
    network: $networkStore,
  },
  ({ transferStore, network }) => {
    if (!network || !transferStore) return undefined;

    return transferStore.xcmChain.chainId === network.chain.chainId ? undefined : transferStore.xcmChain;
  },
  { skipVoid: false },
);

const $initiatorWallet = combine(
  {
    store: $transferStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.account.walletId);
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
  fn: ({ transactions, formData }) => ({
    wrappedTx: transactions.wrappedTx,
    multisigTx: transactions.multisigTx || null,
    coreTx: transactions.coreTx,
    transferStore: formData,
  }),
  target: spread({
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
    transferStore: $transferStore,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: $networkStore,
  filter: (network: NetworkStore | null): network is NetworkStore => Boolean(network),
  fn: ({ chain, asset }, { formData }) => ({
    event: { ...formData, chain, asset },
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
    transferStore: $transferStore,
    networkStore: $networkStore,
    wrappedTx: $wrappedTx,
  },
  filter: ({ transferStore, networkStore, wrappedTx }) => {
    return Boolean(transferStore) && Boolean(networkStore) && Boolean(wrappedTx);
  },
  fn: ({ transferStore, networkStore, wrappedTx }) => ({
    event: {
      chain: networkStore!.chain,
      accounts: [transferStore!.account],
      signatory: transferStore!.signatory,
      transactions: [wrappedTx!],
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
    transferStore: $transferStore,
    networkStore: $networkStore,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
  },
  filter: (transferData) => {
    return Boolean(transferData.transferStore) && Boolean(transferData.coreTx) && Boolean(transferData.networkStore);
  },
  fn: (transferData, signParams) => ({
    event: {
      ...signParams,
      chain: transferData.networkStore!.chain,
      account: transferData.transferStore!.account,
      signatory: transferData.transferStore!.signatory,
      description: transferData.transferStore!.description,
      transactions: [transferData.coreTx!],
      multisigTxs: transferData.multisigTx ? [transferData.multisigTx] : [],
    },
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: delay(submitModel.output.formSubmitted, 2000),
  source: $step,
  filter: (step) => transferUtils.isSubmitStep(step),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
});

sample({
  clock: flowFinished,
  target: attach({
    source: $navigation,
    effect: (state) => state?.navigate(Paths.ASSETS, { replace: true }),
  }),
});

sample({
  clock: txSaved,
  source: {
    transferStore: $transferStore,
    coreTx: $coreTx,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ transferStore, coreTx, txWrappers }: any) =>
    Boolean(transferStore) && Boolean(coreTx) && Boolean(txWrappers),
  fn: ({ transferStore, coreTx, txWrappers }) => {
    const tx = {
      initiatorWallet: transferStore!.account.walletId,
      coreTx,
      txWrappers,
    } as BasketTransaction;

    return [tx];
  },
  target: basketModel.events.transactionsCreated,
});

sample({
  clock: txSaved,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
});

export const transferModel = {
  $step,
  $xcmChain,
  $initiatorWallet,

  events: {
    flowStarted,
    txSaved,
    stepChanged,
    navigateApiChanged: navigationApi.navigateApiChanged,
  },
  output: {
    flowFinished,
  },
};
