import { combine, createEvent, createStore, restore, sample } from 'effector';
import { once, spread } from 'patronum';

import { type BasketTransaction, type Transaction } from '@/shared/core';
import { type PathType, Paths } from '@/shared/routes';
import { basketModel } from '@/entities/basket';
import { walletModel, walletUtils } from '@/entities/wallet';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { transferConfirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStore, Step, type TransferStore } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

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
    store: formData,
  }),
  target: spread({
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
    store: $transferStore,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: { networkStore: $networkStore, coreTx: $coreTx },
  filter: ({ networkStore }) => Boolean(networkStore),
  fn: ({ networkStore, coreTx }, { formData }) => ({
    event: [
      {
        ...formData,
        chain: networkStore!.chain,
        asset: networkStore!.asset!,
        coreTx,
      },
    ],
    step: Step.CONFIRM,
  }),
  target: spread({
    event: transferConfirmModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: transferConfirmModel.output.formConfirmed,
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
      signingPayloads: [
        {
          chain: networkStore!.chain,
          account: transferStore!.account,
          signatory: transferStore!.signatory,
          transaction: wrappedTx!,
        },
      ],
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
    wrappedTx: $wrappedTx,
  },
  filter: (transferData) => {
    return (
      Boolean(transferData.transferStore) &&
      Boolean(transferData.wrappedTx) &&
      Boolean(transferData.coreTx) &&
      Boolean(transferData.networkStore)
    );
  },
  fn: (transferData, signParams) => ({
    event: {
      ...signParams,
      chain: transferData.networkStore!.chain,
      account: transferData.transferStore!.account,
      signatory: transferData.transferStore!.signatory,
      wrappedTxs: [transferData.wrappedTx!],
      coreTxs: [transferData.coreTx!],
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
  clock: submitModel.output.formSubmitted,
  source: formModel.$isMultisig,
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0].result),
  fn: () => Paths.OPERATIONS,
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
});

sample({
  clock: once({ source: flowFinished, reset: flowStarted }),
  source: $redirectAfterSubmitPath,
  fn: (path) => path || Paths.ASSETS,
  target: navigationModel.events.navigateTo,
});

sample({
  clock: txSaved,
  source: {
    transferStore: $transferStore,
    coreTx: $coreTx,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ transferStore, coreTx, txWrappers }) => Boolean(transferStore) && Boolean(coreTx) && Boolean(txWrappers),
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
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const transferModel = {
  $step,
  $xcmChain,
  $initiatorWallet,

  events: {
    flowStarted,
    txSaved,
    stepChanged,
  },

  output: {
    flowFinished,
  },
};
