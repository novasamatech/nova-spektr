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

const $step = restore(stepChanged, Step.NONE);

const $unstakeStore = createStore<UnstakeStore | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

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
  fn: ({ transaction, formData }) => {
    return {
      coreTx: transaction,
      unstakeStore: formData,
    };
  },
  target: spread({
    coreTx: $coreTx,
    unstakeStore: $unstakeStore,
  }),
});

const formSubmitted = sample({
  clock: formModel.output.formSubmitted,
  source: {
    networkStore: $networkStore,
    coreTx: $coreTx,
    api: formModel.$api,
    tx: formModel.$tx,
  },
  fn: (source, { formData }) => {
    return {
      ...source,
      formData,
    };
  },
}).filterMap(({ formData, tx, networkStore, api, coreTx }) => {
  if (
    nonNullable(formData.initiator) &&
    nonNullable(formData.signatory) &&
    nonNullable(coreTx) &&
    nonNullable(networkStore) &&
    nonNullable(api) &&
    nonNullable(tx)
  ) {
    return [
      {
        ...formData,
        initiator: formData.initiator,
        signatory: formData.signatory,
        chain: networkStore.chain,
        asset: getRelaychainAsset(networkStore.chain.assets)!,
        api: api,
        tx: tx,
        coreTx: coreTx,
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
    return nonNullable(unstakeStore) && nonNullable(networkStore) && nonNullable(transaction);
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
    coreTx: $coreTx,
    tx: formModel.$tx,
  },
  fn: (source, signParams) => ({
    ...source,
    signParams,
  }),
}).filterMap(({ unstakeStore, coreTx, networkStore, tx, signParams }) => {
  if (nonNullable(unstakeStore) && nonNullable(coreTx) && nonNullable(tx) && nonNullable(networkStore)) {
    return {
      ...signParams,
      chain: networkStore.chain,
      account: unstakeStore.initiator,
      signatory: unstakeStore.signatory,
      wrappedTxs: [tx],
      coreTxs: [coreTx],
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
    coreTx: $coreTx,
    route: formModel.$route,
  },
  fn: ({ coreTx, route }) => {
    if (!coreTx) return [];

    return [
      {
        initiatorAccountId: coreTx.accountId,
        coreTx,
        route,
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
