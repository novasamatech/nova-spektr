import { combine, createEvent, createStore, restore, sample } from 'effector';
import { once, spread } from 'patronum';

import { type Transaction } from '@/shared/core';
import { isStep, nonNullable, nullable, validateAddress } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { type TransferConfirmStore, transferConfirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStore, Step, type TransferStore } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $transferStore = createStore<TransferStore | null>(null);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $tx = createStore<Transaction | null>(null);
const $coreTx = createStore<Transaction | null>(null);

const $xcmChain = combine(
  {
    transferStore: $transferStore,
    network: $networkStore,
  },
  ({ transferStore, network }) => {
    if (!network || !transferStore) return null;

    return transferStore.destinationChain.chainId === network.chain.chainId
      ? null
      : (transferStore.destinationChain ?? null);
  },
);

const $initiatorWallet = combine(
  {
    store: $transferStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return null;
    return walletUtils.getWalletById(wallets, store.initiator.walletId) ?? null;
  },
);

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  target: formModel.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModel.formSubmitted,
  fn: ({
    tx,
    coreTx,
    initiator,
    signatory,
    amount,
    destination,
    destinationChain,
    fee,
    xcmFee,
    multisigDeposit,
    includeExistentialDeposit,
  }) => {
    const store: TransferStore = {
      initiator,
      signatory,
      amount,
      destination,
      destinationChain,
      fee,
      xcmFee,
      multisigDeposit,
    };

    return {
      tx,
      coreTx,
      store,
      includeExistentialDeposit,
    };
  },
  target: spread({
    tx: $tx,
    coreTx: $coreTx,
    store: $transferStore,
  }),
});

const readyToConfirm = sample({
  clock: formModel.formSubmitted,
  source: {
    networkStore: $networkStore,
  },
  fn: ({ networkStore }, form) => {
    if (nullable(networkStore) || !validateAddress(form.destination)) return null;

    const event: TransferConfirmStore = {
      id: 0,
      coreTx: form.coreTx,
      tx: form.tx,
      chain: networkStore.chain,
      asset: networkStore.asset,
      initiator: form.initiator,
      signatory: form.signatory,
      destinationChain: form.destinationChain,
      destination: form.destination,
      route: form.route,
      amount: form.amount,
      rawAmount: form.rawAmount,
      fee: form.fee,
      xcmFee: form.xcmFee,
      deliveryFee: form.deliveryFee,
      multisigDeposit: form.multisigDeposit,
      includeExistentialDeposit: form.includeExistentialDeposit,
    };

    return event;
  },
});

sample({
  clock: readyToConfirm.filter({ fn: nonNullable }),
  fn: (event) => ({
    events: [event],
    step: Step.CONFIRM,
  }),
  target: spread({
    events: transferConfirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: transferConfirmModel.confirmed,
  source: {
    transferStore: $transferStore,
    networkStore: $networkStore,
    wrappedTx: $tx,
  },
  filter: ({ transferStore, networkStore, wrappedTx }) => {
    return Boolean(transferStore) && Boolean(networkStore) && Boolean(wrappedTx);
  },
  fn: ({ transferStore, networkStore, wrappedTx }) => ({
    event: {
      signingPayloads: [
        {
          chain: networkStore!.chain,
          account: transferStore!.initiator,
          signatory: transferStore!.signatory,
          transaction: wrappedTx!,
        },
      ],
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
    step: $step,
    transferStore: $transferStore,
    networkStore: $networkStore,
    coreTx: $coreTx,
    wrappedTx: $tx,
  },
  filter: (transferData) => {
    return (
      isStep(transferData.step, Step.SIGN) &&
      Boolean(transferData.transferStore) &&
      Boolean(transferData.wrappedTx) &&
      Boolean(transferData.coreTx) &&
      Boolean(transferData.networkStore)
    );
  },
  fn: (transferData, signParams) => ({
    event: {
      ...signParams,
      chain: transferData.networkStore!.chain,
      account: transferData.transferStore!.initiator,
      signatory: transferData.transferStore!.signatory,
      wrappedTxs: [transferData.wrappedTx!],
      coreTxs: [transferData.coreTx!],
    },
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: submitModel.output.formSubmitted,
  source: formModel.$multisigAccount,
  filter: (multisigAccount, results) => nonNullable(multisigAccount) && submitUtils.isSuccessResult(results[0].result),
  fn: () => Paths.OPERATIONS,
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.formCleared],
});

sample({
  clock: once({ source: flowFinished, reset: flowStarted }),
  source: $redirectAfterSubmitPath,
  fn: (path) => path || Paths.ASSETS,
  target: navigationModel.events.navigateTo,
});

sample({
  clock: txSaved,
  source: {
    coreTx: $coreTx,
  },
  filter: ({ coreTx }) => nonNullable(coreTx),
  fn: ({ coreTx }) => {
    const tx: BasketTransactionDraft = {
      initiatorAccountId: coreTx!.accountId,
      coreTx: coreTx!,
      route: [],
      createdAt: Date.now(),
    };

    return [tx];
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const transferModel = {
  $step,
  $xcmChain,
  $initiatorWallet,

  events: {
    flowStarted,
    txSaved,
    stepChanged,
  },

  output: {
    flowFinished,
  },
};
