import { createEvent, createStore, sample } from 'effector';

import { Step } from '../lib/types';
import { Transaction, TransactionType } from '@entities/transaction';
import { ChainId, Address, ProxyType } from '@shared/core';

export type Callbacks = {
  onClose: () => void;
};

const stepChanged = createEvent<Step>();
const txCreated = createEvent<{
  chainId: ChainId;
  address: Address;
  delegate: Address;
  proxyType: ProxyType;
}>();

const $step = createStore<Step>(Step.INIT);
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
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

sample({
  clock: txCreated,
  fn: ({ chainId, address, proxyType, delegate }) => {
    return {
      chainId,
      address,
      type: TransactionType.ADD_PROXY,
      args: { delegate, proxyType, delay: 0 },
    } as Transaction;
  },
  target: $transaction,
});

export const addProxyModel = {
  $step,
  events: {
    stepChanged,
    txCreated,
  },
};
