import { createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { Transaction, TransactionType } from '@entities/transaction';
import { Step, FormValues } from '../lib/types';
import { toAddress } from '@shared/lib/utils';
import type { Account } from '@shared/core';

export type Callbacks = {
  onClose: () => void;
};

const stepChanged = createEvent<Step>();
const txCreated = createEvent<FormValues>();

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

sample({
  clock: stepChanged,
  target: $step,
});

sample({
  clock: txCreated,
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
  clock: txCreated,
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
  clock: txCreated,
  fn: () => Step.SIGN,
  // fn: () => Step.CONFIRM,
  target: stepChanged,
});

$transaction.watch((v) => {
  console.log('=== tx', v);
});

export const addProxyModel = {
  $step,

  $account,
  $signatory,
  $description,
  $transaction,
  events: {
    stepChanged,
    txCreated,
  },
};
