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
import { unstakeConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStore, Step, type UnstakeStore } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $unstakeStore = createStore<UnstakeStore | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    store: $unstakeStore,
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
  target: formModel.events.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModel.output.formSubmitted,
  fn: ({ transaction, multisigTx, formData }) => {
    return {
      coreTx: transaction,
      multisigTx,
      unstakeStore: formData,
    };
  },
  target: spread({
    multisigTx: $multisigTx,
    coreTx: $coreTx,
    unstakeStore: $unstakeStore,
  }),
});

const formSubmitted = sample({
  clock: formModel.output.formSubmitted,
  source: {
    networkStore: $networkStore,
    coreTx: $coreTx,
    multisigTx: $multisigTx,
    api: formModel.$api,
  },
  fn: (source, { formData }) => {
    return {
      ...source,
      formData,
    };
  },
}).filterMap(({ formData, multisigTx, networkStore, api, coreTx }) => {
  if (
    nonNullable(formData.initiator) &&
    nonNullable(formData.signatory) &&
    nonNullable(coreTx) &&
    nonNullable(networkStore) &&
    nonNullable(api) &&
    nonNullable(multisigTx)
  ) {
    return [
      {
        ...formData,
        initiator: formData.initiator,
        signatory: formData.signatory,
        chain: networkStore.chain,
        asset: getRelaychainAsset(networkStore.chain.assets)!,
        api: api,
        tx: coreTx,
        coreTx: coreTx,
        multisigTx: multisigTx,
      },
    ];
  }
});

sample({
  clock: formSubmitted,
  fn: (event) => {
    return {
      event,
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigning,
  source: {
    unstakeStore: $unstakeStore,
    networkStore: $networkStore,
    transaction: $coreTx,
  },
  filter: ({ unstakeStore, networkStore, transaction }) => {
    return Boolean(unstakeStore) && Boolean(networkStore) && Boolean(transaction);
  },
  fn: ({ unstakeStore, networkStore, transaction }) => ({
    event: {
      signingPayloads: [
        {
          chain: networkStore!.chain,
          account: unstakeStore!.initiator,
          signatory: unstakeStore!.signatory,
          transaction: transaction!,
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

const signSubmitted = sample({
  clock: signModel.output.formSubmitted,
  source: {
    unstakeStore: $unstakeStore,
    networkStore: $networkStore,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
  },
  fn: (source, signParams) => ({
    ...source,
    signParams,
  }),
}).filterMap(({ unstakeStore, coreTx, multisigTx, networkStore, signParams }) => {
  if (nonNullable(unstakeStore) && nonNullable(coreTx) && nonNullable(networkStore)) {
    return {
      ...signParams,
      chain: networkStore.chain,
      account: unstakeStore.initiator,
      signatory: unstakeStore.signatory,
      wrappedTxs: [coreTx],
      coreTxs: [coreTx],
      multisigTxs: multisigTx ? [multisigTx] : [],
    };
  }
});

sample({
  clock: signSubmitted,
  fn: (event) => {
    return {
      event,
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.form.reset],
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
    store: $unstakeStore,
    coreTx: $coreTx,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ store, coreTx, txWrappers }) => {
    return Boolean(store) && Boolean(coreTx) && Boolean(txWrappers);
  },
  fn: ({ store, coreTx, txWrappers }) => {
    return [
      {
        initiatorAccountId: store!.initiator.accountId,
        coreTx: coreTx!,
        txWrappers,
        createdAt: Date.now(),
      },
    ];
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const unstakeModel = {
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
