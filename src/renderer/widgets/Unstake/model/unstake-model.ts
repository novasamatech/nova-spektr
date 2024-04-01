import { createEvent, createStore, sample, restore, createApi, attach } from 'effector';
import { spread, delay } from 'patronum';
import { NavigateFunction } from 'react-router-dom';

import { Transaction } from '@entities/transaction';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { Paths } from '@shared/routes';
import { Step, UnstakeStore, NetworkStore } from '../lib/types';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';

const $navigation = createStore<{ navigate: NavigateFunction } | null>(null);
const navigationApi = createApi($navigation, {
  navigateApiChanged: (state, { navigate }) => ({ ...state, navigate }),
});

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $unstakeStore = createStore<UnstakeStore | null>(null);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $wrappedTx = createStore<Transaction | null>(null);
const $multisigTx = createStore<Transaction | null>(null);
const $coreTx = createStore<Transaction | null>(null);

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
    transferStore: $unstakeStore,
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
    transferStore: $unstakeStore,
    networkStore: $networkStore,
    wrappedTx: $wrappedTx,
  },
  filter: ({ transferStore, networkStore, wrappedTx }) => {
    return Boolean(transferStore) && Boolean(networkStore) && Boolean(wrappedTx);
  },
  fn: ({ transferStore, networkStore, wrappedTx }) => ({
    event: {
      chain: networkStore!.chain,
      account: transferStore!.account,
      signatory: transferStore!.signatory,
      transaction: wrappedTx!,
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
    transferStore: $unstakeStore,
    networkStore: $networkStore,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
  },
  filter: (transferData) => {
    return Boolean(transferData.transferStore) && Boolean(transferData.coreTx);
  },
  fn: (transferData, signParams) => ({
    event: {
      ...signParams,
      chain: transferData.networkStore!.chain,
      account: transferData.transferStore!.account,
      signatory: transferData.transferStore!.signatory,
      description: transferData.transferStore!.description,
      transaction: transferData.coreTx!,
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
  target: [stepChanged, formModel.events.formCleared],
});

sample({
  clock: flowFinished,
  target: attach({
    source: $navigation,
    effect: (state) => state?.navigate(Paths.STAKING, { replace: true }),
  }),
});

export const unstakeModel = {
  $step,
  events: {
    flowStarted,
    stepChanged,
    navigateApiChanged: navigationApi.navigateApiChanged,
  },
  output: {
    flowFinished,
  },
};
