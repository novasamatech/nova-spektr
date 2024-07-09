import { createEvent, createStore, sample, restore, combine } from 'effector';
import { spread, delay } from 'patronum';

import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { Step, WithdrawData, NetworkStore } from '../lib/types';
import { formModel } from './form-model';
import { withdrawConfirmModel as confirmModel } from '@features/operations/OperationsConfirm';
import { nonNullable, getRelaychainAsset } from '@shared/lib/utils';
import { withdrawUtils } from '../lib/withdraw-utils';
import { BasketTransaction, Transaction } from '@shared/core';
import { basketModel } from '@entities/basket';
import { walletModel, walletUtils } from '@entities/wallet';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $withdrawData = createStore<WithdrawData | null>(null);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $wrappedTxs = createStore<Transaction[] | null>(null);
const $multisigTxs = createStore<Transaction[] | null>(null);
const $coreTxs = createStore<Transaction[] | null>(null);

const $initiatorWallet = combine(
  {
    store: $withdrawData,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.shards[0].walletId);
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
  fn: ({ transactions, formData }) => {
    const wrappedTxs = transactions.map((tx) => tx.wrappedTx);
    const multisigTxs = transactions.map((tx) => tx.multisigTx).filter(nonNullable);
    const coreTxs = transactions.map((tx) => tx.coreTx);

    return {
      wrappedTxs,
      multisigTxs: multisigTxs.length === 0 ? null : multisigTxs,
      coreTxs,
      withdrawData: formData,
    };
  },
  target: spread({
    wrappedTxs: $wrappedTxs,
    multisigTxs: $multisigTxs,
    coreTxs: $coreTxs,
    withdrawData: $withdrawData,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: $networkStore,
  filter: (network: NetworkStore | null): network is NetworkStore => Boolean(network),
  fn: ({ chain }, { formData }) => ({
    event: [{ ...formData, chain, asset: getRelaychainAsset(chain.assets)! }],
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
    withdrawData: $withdrawData,
    networkStore: $networkStore,
    wrappedTxs: $wrappedTxs,
  },
  filter: ({ withdrawData, networkStore, wrappedTxs }) => {
    return Boolean(withdrawData) && Boolean(networkStore) && Boolean(wrappedTxs);
  },
  fn: ({ withdrawData, networkStore, wrappedTxs }) => ({
    event: {
      signingPayloads: wrappedTxs!.map((tx, index) => ({
        chain: networkStore!.chain,
        account: withdrawData!.shards[index],
        signatory: withdrawData!.signatory,
        transaction: tx!,
      })),
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
    withdrawData: $withdrawData,
    networkStore: $networkStore,
    multisigTxs: $multisigTxs,
    coreTxs: $coreTxs,
    wrappedTxs: $wrappedTxs,
  },
  filter: (withdrawData) => {
    return (
      Boolean(withdrawData.withdrawData) &&
      Boolean(withdrawData.wrappedTxs) &&
      Boolean(withdrawData.coreTxs) &&
      Boolean(withdrawData.networkStore)
    );
  },
  fn: (withdrawData, signParams) => ({
    event: {
      ...signParams,
      chainId: withdrawData.networkStore!.chain.chainId,
      account: withdrawData.withdrawData!.shards[0],
      signatory: withdrawData.withdrawData!.signatory,
      description: withdrawData.withdrawData!.description,
      coreTxs: withdrawData.coreTxs!,
      wrappedTxs: withdrawData.wrappedTxs!,
      multisigTxs: withdrawData.multisigTxs || [],
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
  source: $step,
  filter: (step) => withdrawUtils.isSubmitStep(step),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
});

sample({
  clock: txSaved,
  source: {
    store: $withdrawData,
    coreTxs: $coreTxs,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ store, coreTxs, txWrappers }: any) => {
    return Boolean(store) && Boolean(coreTxs) && Boolean(txWrappers);
  },
  fn: ({ store, coreTxs, txWrappers }) => {
    const txs = coreTxs!.map(
      (coreTx) =>
        ({
          initiatorWallet: store!.shards[0].walletId,
          coreTx,
          txWrappers,
          groupId: Date.now(),
        } as BasketTransaction),
    );

    return txs;
  },
  target: basketModel.events.transactionsCreated,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const withdrawModel = {
  $step,
  $networkStore,
  $initiatorWallet,

  events: {
    flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
