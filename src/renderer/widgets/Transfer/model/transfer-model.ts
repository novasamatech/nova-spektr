import { createEvent, createStore, sample, restore, combine, createApi, attach } from 'effector';
import { spread, delay } from 'patronum';
import { NavigateFunction } from 'react-router-dom';

import { Transaction } from '@entities/transaction';
import { Step, TransferStore, NetworkStore } from '../lib/types';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { signModel } from './sign-model';
import { submitModel } from './submit-model';
import { Paths } from '@shared/routes';

const $navigation = createStore<{ navigate: NavigateFunction } | null>(null);
const navigationApi = createApi($navigation, {
  navigateApiChanged: (state, { navigate }) => ({ ...state, navigate }),
});

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $transferStore = createStore<TransferStore | null>(null);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $transaction = createStore<Transaction | null>(null);
const $multisigTx = createStore<Transaction | null>(null);

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
  fn: ({ transaction, formData }) => ({
    transaction: transaction.wrappedTx,
    multisigTx: transaction.multisigTx || null,
    transferStore: formData,
  }),
  target: spread({
    transaction: $transaction,
    multisigTx: $multisigTx,
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
    transaction: $transaction,
  },
  filter: ({ transferStore, networkStore, transaction }) => {
    return Boolean(transferStore) && Boolean(networkStore) && Boolean(transaction);
  },
  fn: ({ transferStore, networkStore, transaction }) => ({
    event: {
      chain: networkStore!.chain,
      account: transferStore!.account,
      signatory: transferStore!.signatory,
      transaction: transaction!,
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
    transaction: $transaction,
    multisigTx: $multisigTx,
  },
  filter: (transferData) => {
    return Boolean(transferData.transferStore) && Boolean(transferData.transaction);
  },
  fn: (transferData, signParams) => ({
    event: {
      ...signParams,
      chain: transferData.networkStore!.chain,
      account: transferData.transferStore!.account,
      signatory: transferData.transferStore!.signatory,
      description: transferData.transferStore!.description,
      transaction: transferData.transaction!,
      multisigTx: transferData.multisigTx || undefined,
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
  target: flowFinished,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

sample({
  clock: flowFinished,
  target: attach({
    source: $navigation,
    effect: (state) => state?.navigate(Paths.ASSETS, { replace: true }),
  }),
});

export const transferModel = {
  $step,
  $xcmChain,
  events: {
    flowStarted,
    stepChanged,
    navigateApiChanged: navigationApi.navigateApiChanged,
  },
  output: {
    flowFinished,
  },
};
