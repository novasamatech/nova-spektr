import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Transaction } from '@/shared/core';
import { getRelaychainAsset, nonNullable } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { walletModel, walletUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { type WithdrawConfirm, withdrawConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStore, Step, type WithdrawData } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $withdrawData = createStore<WithdrawData | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $wrappedTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $coreTxs = createStore<Transaction[] | null>(null).reset(flowFinished);

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

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
    const coreTxs = transactions.map((tx) => tx.coreTx);

    return {
      wrappedTxs,
      coreTxs,
      store: formData,
    };
  },
  target: spread({
    wrappedTxs: $wrappedTxs,
    coreTxs: $coreTxs,
    store: $withdrawData,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: { networkStore: $networkStore, coreTxs: $coreTxs },
  filter: ({ networkStore }) => nonNullable(networkStore),
  fn: ({ networkStore, coreTxs }, { formData }) => ({
    event: formData.shards.map((shard, index) => {
      return {
        ...formData,
        signatory: shard,
        initiator: shard,
        route: [shard],
        tx: coreTxs![index],
        chain: networkStore!.chain,
        asset: getRelaychainAsset(networkStore!.chain.assets)!,
        coreTx: coreTxs![index],
      } satisfies WithdrawConfirm;
    }),
    step: Step.CONFIRM,
  }),
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigning,
  source: {
    withdrawData: $withdrawData,
    networkStore: $networkStore,
    wrappedTxs: $wrappedTxs,
  },
  filter: ({ withdrawData, networkStore, wrappedTxs }) => {
    return nonNullable(withdrawData) && nonNullable(networkStore) && nonNullable(wrappedTxs);
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
    coreTxs: $coreTxs,
    wrappedTxs: $wrappedTxs,
  },
  filter: (withdrawData) => {
    return (
      nonNullable(withdrawData.withdrawData) &&
      nonNullable(withdrawData.wrappedTxs) &&
      nonNullable(withdrawData.coreTxs) &&
      nonNullable(withdrawData.networkStore)
    );
  },
  fn: (withdrawData, signParams) => ({
    event: {
      ...signParams,
      chain: withdrawData.networkStore!.chain,
      account: withdrawData.withdrawData!.shards[0],
      signatory: withdrawData.withdrawData!.signatory,
      coreTxs: withdrawData.coreTxs!,
      wrappedTxs: withdrawData.wrappedTxs!,
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
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
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
    store: $withdrawData,
    coreTxs: $coreTxs,
  },
  filter: ({ store, coreTxs }) => {
    return nonNullable(store) && nonNullable(coreTxs);
  },
  fn: ({ store, coreTxs }) =>
    coreTxs!.map((coreTx) => ({
      initiatorAccountId: store!.shards[0].accountId,
      coreTx,
      route: [],
      createdAt: Date.now(),
    })),
  target: basketOperations.addTransactions,
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
