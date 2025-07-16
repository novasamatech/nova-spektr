import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Transaction } from '@/shared/core';
import { isStep, nonNullable, nullable } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { balanceSubModel } from '@/features/assets-balances';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type AddProxyConfirm,
  addProxyConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm/AddProxy';
import { proxiesModel } from '@/features/proxies';
import { type AddProxyStore, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent();
const flowFinished = createEvent();
const flowClosed = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $addProxyStore = createStore<AddProxyStore | null>(null).reset(flowFinished);
const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);
const $chain = $addProxyStore.map((store) => store?.chain ?? null);

const $initiatorWallet = combine(
  {
    store: $addProxyStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store?.initiator) return null;

    return walletUtils.getWalletById(wallets, store.initiator.walletId);
  },
);

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: flowStarted,
  source: {
    activeWallet: walletSelect.$selectedWallet,
    walletDetails: formModel.$wallet,
  },
  filter: ({ activeWallet, walletDetails }) => {
    if (!activeWallet || !walletDetails) return false;

    return activeWallet !== walletDetails;
  },
  fn: ({ walletDetails }) => walletDetails!,
  target: balanceSubModel.events.walletToSubSet,
});

sample({
  clock: flowStarted,
  target: formModel.formInitiated,
});

sample({
  clock: formModel.formSubmitted,
  fn: ({ transactions, formData }) => ({
    wrappedTx: transactions.wrappedTx,
    coreTx: transactions.coreTx,
    store: formData,
  }),
  target: spread({
    wrappedTx: $wrappedTx,
    coreTx: $coreTx,
    store: $addProxyStore,
  }),
});

const formSubmitted = sample({
  clock: formModel.formSubmitted,
  source: {
    route: formModel.$route,
    step: $step,
  },
  fn: (source, formData) => ({ source, formData }),
}).filterMap(({ formData: { formData, transactions }, source: { route, step } }) => {
  if (
    nonNullable(transactions.coreTx) &&
    nonNullable(transactions.wrappedTx) &&
    nonNullable(formData.initiator) &&
    nonNullable(formData.signatory) &&
    nonNullable(route) &&
    isStep(step, Step.INIT)
  ) {
    return [
      {
        ...formData,
        initiator: formData.initiator,
        signatory: formData.signatory,
        tx: transactions.wrappedTx,
        coreTx: transactions.coreTx,
        route,
      } satisfies AddProxyConfirm,
    ];
  }
});

sample({
  clock: formSubmitted,
  fn: (event) => ({ event, step: Step.CONFIRM }),
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigning,
  source: {
    addProxyStore: $addProxyStore,
    wrappedTx: $wrappedTx,
  },
  filter: ({ addProxyStore, wrappedTx }) => nonNullable(addProxyStore) && nonNullable(wrappedTx),
  fn: ({ addProxyStore, wrappedTx }) => ({
    event: {
      signingPayloads: [
        {
          chain: addProxyStore!.chain,
          account: addProxyStore!.initiator!,
          signatory: addProxyStore!.signatory,
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
    addProxyStore: $addProxyStore,
    coreTx: $coreTx,
    wrappedTx: $wrappedTx,
  },
  filter: (proxyData) => {
    return nonNullable(proxyData.addProxyStore) && nonNullable(proxyData.wrappedTx) && nonNullable(proxyData.coreTx);
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.addProxyStore!.chain,
      account: proxyData.addProxyStore!.initiator!,
      signatory: proxyData.addProxyStore!.signatory,
      coreTxs: [proxyData.coreTx!],
      wrappedTxs: [proxyData.wrappedTx!],
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
  source: $addProxyStore,
  filter: (addProxyStore, results) => nonNullable(addProxyStore) && submitUtils.isSuccessResult(results[0].result),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  source: {
    activeWallet: walletModel.$activeWallet,
    walletDetails: formModel.$wallet,
  },
  filter: ({ activeWallet, walletDetails }) => {
    if (!activeWallet || !walletDetails) return false;

    return activeWallet !== walletDetails;
  },
  fn: ({ walletDetails }) => walletDetails!,
  target: balanceSubModel.events.walletToUnsubSet,
});

sample({
  clock: flowFinished,
  target: proxiesModel.findAllProxies,
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
  },
  fn: ({ coreTx }) => {
    if (nullable(coreTx)) return [];

    const tx: BasketTransactionDraft = {
      initiatorAccountId: coreTx.accountId,
      coreTx,
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

sample({
  clock: [flowFinished, flowClosed],
  fn: () => Step.NONE,
  target: stepChanged,
});

export const addProxyModel = {
  $step,
  $chain,
  $initiatorWallet,

  events: {
    flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
    flowClosed,
  },
};
