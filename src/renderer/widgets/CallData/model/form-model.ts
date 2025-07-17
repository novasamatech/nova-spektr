import { combine, createEvent, createStore, restore, sample } from 'effector';

import { type DecodedTransaction, type HexString, type Wallet } from '@/shared/core';
import { createForm } from '@/shared/forms';
import { nonNullable } from '@/shared/lib/utils';
import { polkadotChainId } from '@/shared/mocks';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { decodeCallData } from '@/entities/transaction';
import { Step } from '../lib/types';

const stepChanged = createEvent<Step>();
const $step = restore(stepChanged, Step.NONE);

type WalletData = {
  wallet: Wallet;
  initiator: AnyAccount;
};

const flowStarted = createEvent<WalletData>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $initiatorWallet = createStore<Wallet | null>(null).reset(flowStarted);
const $walletData = restore<WalletData | null>(flowStarted, null).reset(flowFinished);

const $decodedTx = createStore<DecodedTransaction | null>(null);

const form = createForm({
  fields: {
    initiator: {
      defaultValue: null,
    },
    chain: {
      defaultValue: polkadotChainId,
    },
    callData: {
      defaultValue: '',
      validator: () => ({
        source: combine({
          walletData: $walletData,
        }),
        fn: (callData) => {
          if (!callData) return { message: 'callData.errors.required' };

          if (!callData.startsWith('0x')) {
            return { message: 'callData.errors.0xPrefix' };
          }
        },
      }),
    },
  },
});

const $api = combine(
  {
    chain: form.fields.chain.$value,
    apis: networkModel.$apis,
  },
  (params) => {
    return params.apis[params.chain];
  },
);

const $canSubmit = combine(
  {
    isValid: form.$isValid,
    decodedTx: $decodedTx,
  },
  ({ isValid, decodedTx }) => isValid && nonNullable(decodedTx),
);

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: form.fields.callData.$value,
  source: {
    callData: form.fields.callData.$value,
    api: $api,
    account: $walletData.map((walletData) => walletData?.initiator),
  },
  fn: ({ callData, api, account }) => {
    if (!account || !callData) return null;

    try {
      return decodeCallData(api, account.accountId, callData as HexString);
    } catch (error) {
      console.error(error);
      form.fields.callData.setErrors([{ message: 'callData.errors.invalidCallData' }]);
      return null;
    }
  },
  target: $decodedTx,
});

sample({
  clock: flowFinished,
  target: [form.reset],
});

export const formModel = {
  form,
  $canSubmit,
  $step,

  $api,
  $initiatorWallet,
  $walletData,
  $decodedTx,

  events: {
    flowStarted,
    flowFinished,
    txSaved,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
