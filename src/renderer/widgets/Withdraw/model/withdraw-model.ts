import { createEvent, createStore, sample, restore } from 'effector';
import { spread, delay } from 'patronum';

import { Transaction } from '@entities/transaction';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { Step, WithdrawStore, NetworkStore } from '../lib/types';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { nonNullable, getRelaychainAsset } from '@shared/lib/utils';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $withdrawStore = createStore<WithdrawStore | null>(null);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $wrappedTxs = createStore<Transaction[] | null>(null);
const $multisigTxs = createStore<Transaction[] | null>(null);
const $coreTxs = createStore<Transaction[] | null>(null);

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
      multisigTxs: multisigTxs.length === 0 ? null : multisigTxs,
      coreTxs,
      withdrawStore: formData,
    };
  },
  target: spread({
    wrappedTxs: $wrappedTxs,
    multisigTxs: $multisigTxs,
    coreTxs: $coreTxs,
    withdrawStore: $withdrawStore,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: $networkStore,
  filter: (network: NetworkStore | null): network is NetworkStore => Boolean(network),
  fn: ({ chain }, { formData }) => ({
    event: { ...formData, chain, asset: getRelaychainAsset(chain.assets)! },
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
    withdrawStore: $withdrawStore,
    networkStore: $networkStore,
    wrappedTxs: $wrappedTxs,
  },
  filter: ({ withdrawStore, networkStore, wrappedTxs }) => {
    return Boolean(withdrawStore) && Boolean(networkStore) && Boolean(wrappedTxs);
  },
  fn: ({ withdrawStore, networkStore, wrappedTxs }) => ({
    event: {
      chain: networkStore!.chain,
      accounts: withdrawStore!.shards,
      signatory: withdrawStore!.signatory,
      transactions: wrappedTxs!,
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
    withdrawStore: $withdrawStore,
    networkStore: $networkStore,
    multisigTxs: $multisigTxs,
    coreTxs: $coreTxs,
  },
  filter: (withdrawData) => {
    return Boolean(withdrawData.withdrawStore) && Boolean(withdrawData.coreTxs) && Boolean(withdrawData.networkStore);
  },
  fn: (withdrawData, signParams) => ({
    event: {
      ...signParams,
      chain: withdrawData.networkStore!.chain,
      account: withdrawData.withdrawStore!.shards[0],
      signatory: withdrawData.withdrawStore!.signatory,
      description: withdrawData.withdrawStore!.description,
      transactions: withdrawData.coreTxs!,
      multisigTxs: withdrawData.multisigTxs || undefined,
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

export const withdrawModel = {
  $step,
  $networkStore,
  events: {
    flowStarted,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
