import { createEvent, createStore, sample, createApi } from 'effector';
import { spread } from 'patronum';
import { attach } from 'effector/effector.cjs';

import { Transaction, TransactionType } from '@entities/transaction';
import { toAddress } from '@shared/lib/utils';
import type { Account } from '@shared/core';
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

// Handle proxy-form (Step.INIT)

sample({
  clock: stepChanged,
  filter: addProxyUtils.isInitStep,
  target: formModel.events.formInitiated,
});

sample({
  clock: formModel.watch.formSubmitted,
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

sample({
  clock: formModel.watch.formSubmitted,
  fn: (formData) => ({
    account: formData.account,
    signatory: Object.keys(formData.signatory).length > 0 ? formData.signatory : null,
    description: formData.description,
  }),
  target: spread({
    account: $account,
    signatory: $signatory,
    description: $description,
  }),
});

sample({
  clock: formModel.watch.formSubmitted,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

// Handle confirm (Step.CONFIRM)

sample({
  clock: stepChanged,
  filter: addProxyUtils.isConfirmStep,
  target: confirmModel.events.formInitiated,
});

sample({
  clock: confirmModel.watch.formSubmitted,
  fn: () => Step.SIGN,
  target: stepChanged,
});

// Handle signing (Step.SIGN)

sample({
  clock: stepChanged,
  filter: addProxyUtils.isSignStep,
  target: signModel.events.formInitiated,
});

sample({
  clock: signModel.watch.formSubmitted,
  fn: () => Step.SUBMIT,
  target: stepChanged,
});

// Handle submit (Step.SUBMIT)

sample({
  clock: stepChanged,
  filter: addProxyUtils.isSubmitStep,
  target: submitModel.events.formInitiated,
});

sample({
  clock: submitModel.watch.formSubmitted,
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

  events: {
    stepChanged,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
