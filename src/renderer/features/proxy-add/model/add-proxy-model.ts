import { combine, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type BasketTransaction, type Transaction } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { basketModel } from '@/entities/basket';
import { walletModel, walletUtils } from '@/entities/wallet';
import { balanceSubModel } from '@/features/assets-balances';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { addProxyConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm/AddProxy';
import { proxiesModel } from '@/features/proxies';
import { type AddProxyStore, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent();
const flowFinished = createEvent();
const flowClosed = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $addProxyStore = createStore<AddProxyStore | null>(null).reset(flowFinished);
const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    store: $addProxyStore,
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
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: flowStarted,
  source: {
    activeWallet: walletModel.$activeWallet,
    walletDetails: formModel.$wallet,
  },
  filter: ({ activeWallet, walletDetails }) => {
    if (!activeWallet || !walletDetails) return false;

    return activeWallet !== walletDetails;
  },
  fn: ({ walletDetails }) => walletDetails!,
  target: balanceSubModel.events.walletToSubSet,
});

sample({
  clock: flowStarted,
  target: formModel.events.formInitiated,
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
    store: $addProxyStore,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  fn: ({ formData, transactions }) => ({
    event: [{ ...formData, transaction: transactions.wrappedTx, coreTx: transactions.coreTx }],
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
    addProxyStore: $addProxyStore,
    wrappedTx: $wrappedTx,
  },
  filter: ({ addProxyStore, wrappedTx }) => Boolean(addProxyStore) && Boolean(wrappedTx),
  fn: ({ addProxyStore, wrappedTx }) => ({
    event: {
      signingPayloads: [
        {
          chain: addProxyStore!.chain,
          account: addProxyStore!.account,
          signatory: addProxyStore!.signatory,
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
    addProxyStore: $addProxyStore,
    coreTx: $coreTx,
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
  },
  filter: (proxyData) => {
    return Boolean(proxyData.addProxyStore) && Boolean(proxyData.wrappedTx) && Boolean(proxyData.coreTx);
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.addProxyStore!.chain,
      account: proxyData.addProxyStore!.account,
      signatory: proxyData.addProxyStore!.signatory,
      coreTxs: [proxyData.coreTx!],
      wrappedTxs: [proxyData.wrappedTx!],
      multisigTxs: proxyData.multisigTx ? [proxyData.multisigTx] : [],
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
  source: {
    activeWallet: walletModel.$activeWallet,
    walletDetails: formModel.$wallet,
  },
  filter: ({ activeWallet, walletDetails }) => {
    if (!activeWallet || !walletDetails) return false;

    return activeWallet !== walletDetails;
  },
  fn: ({ walletDetails }) => walletDetails!,
  target: balanceSubModel.events.walletToUnsubSet,
});

sample({
  clock: flowFinished,
  target: proxiesModel.events.workerStarted,
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
    store: $addProxyStore,
    coreTx: $coreTx,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ store, coreTx, txWrappers }) => {
    return Boolean(store) && Boolean(coreTx) && Boolean(txWrappers);
  },
  fn: ({ store, coreTx, txWrappers }) => {
    const tx = {
      initiatorWallet: store!.account.walletId,
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

sample({
  clock: [flowFinished, flowClosed],
  fn: () => Step.NONE,
  target: stepChanged,
});

export const addProxyModel = {
  $step,
  $chain: $addProxyStore.map((store) => store?.chain, { skipVoid: false }),
  $initiatorWallet,

  events: {
    flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
    flowClosed,
  },
};
