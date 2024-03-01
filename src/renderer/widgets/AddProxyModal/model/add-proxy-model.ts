import { createEvent, createStore, sample, attach, createApi } from 'effector';
import { spread } from 'patronum';

import { Transaction, TransactionType } from '@entities/transaction';
import { toAddress } from '@shared/lib/utils';
import type { Account, Chain } from '@shared/core';
import { Step } from '../lib/types';
import { addProxyUtils } from '../lib/add-proxy-utils';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { signModel } from './sign-model';
import { submitModel } from './submit-model';

export type Callbacks = {
  onClose: () => void;
};

const stepChanged = createEvent<Step>();

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const $step = createStore<Step>(Step.INIT);

const $chain = createStore<Chain | null>(null);
const $account = createStore<Account | null>(null);
const $signatory = createStore<Account | null>(null);
const $description = createStore<string | null>(null);
const $transaction = createStore<Transaction | null>(null);

// const $txWrappers = createStore<'multisig' | 'proxy'[]>([]);

// sample({
//   clock: $step,
//   filter: (step) => addProxyUtils.isSubmitStep(step),
//   target: unsubscribeBalancesFx,
// });

sample({ clock: stepChanged, target: $step });

// Transition to Step.INIT

sample({
  clock: stepChanged,
  filter: addProxyUtils.isInitStep,
  target: formModel.events.formInitiated,
});

sample({
  clock: formModel.output.formSubmitted,
  fn: (formData) => ({
    chain: formData.network,
    account: formData.account,
    signatory: formData.signatory,
    description: formData.description,
  }),
  target: spread({
    chain: $chain,
    account: $account,
    signatory: $signatory,
    description: $description,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  fn: ({ network, account, proxyType, delegate }) => {
    // TODO: wrap in proxy/multisig
    return {
      chainId: network.chainId,
      address: toAddress(account.accountId, { prefix: network.addressPrefix }),
      type: TransactionType.ADD_PROXY,
      args: { delegate, proxyType, delay: 0 },
    } as Transaction;
  },
  target: $transaction,
});

// Transition to Step.CONFIRM

sample({
  clock: formModel.output.formSubmitted,
  source: $transaction,
  fn: (transaction, formData) => ({
    event: {
      chain: formData.network,
      account: formData.account,
      signatory: formData.signatory,
      description: formData.description,
      transaction: transaction!,
    },
    step: Step.CONFIRM,
  }),
  target: spread({
    event: confirmModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.output.formSubmitted,
  fn: () => Step.SIGN,
  target: stepChanged,
});

// Transition to Step.SIGN

sample({
  clock: stepChanged,
  filter: addProxyUtils.isSignStep,
  target: signModel.events.formInitiated,
});

sample({
  clock: signModel.output.formSubmitted,
  fn: () => Step.SUBMIT,
  target: stepChanged,
});

// Transition to Step.SUBMIT

sample({
  clock: stepChanged,
  filter: addProxyUtils.isSubmitStep,
  target: submitModel.events.formInitiated,
});

sample({
  clock: submitModel.output.formSubmitted,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onClose(),
  }),
});

$transaction.watch((v) => {
  console.log('=== tx', v);
});

export const addProxyModel = {
  $step,
  $chain,
  events: {
    stepChanged,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
