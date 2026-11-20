import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Transaction } from '@/shared/core';
import { isStep, nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { getSigningPayloads } from '@/shared/transactions';
import { accountSync, multisigOperationService } from '@/domains/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { balanceSubModel } from '@/features/assets-balances';
import { wireDraftCloseRedirect } from '@/features/drafts';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type AddProxyConfirm,
  addProxyConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm/AddProxy';
import { type AddProxyStore, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowFinished = createEvent();
const flowClosed = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $addProxyStore = createStore<AddProxyStore | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<string | null>(null).reset(formModel.flowStarted);
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
  clock: formModel.flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModel.flowStarted,
  source: formModel.$wallet,
  filter: (wallet) => nonNullable(wallet),
  target: balanceSubModel.fetchWallet,
});

sample({
  clock: formModel.formSubmitted,
  fn: ({ transactions, formData }) => ({
    coreTx: transactions.coreTx,
    store: formData,
  }),
  target: spread({
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
    nonNullable(formData.chain) &&
    nonNullable(formData.initiator) &&
    nonNullable(formData.signatory) &&
    nonNullable(route) &&
    isStep(step, Step.INIT)
  ) {
    return [
      {
        ...formData,
        delegate: toAccountId(formData.delegate),
        chain: formData.chain,
        initiator: formData.initiator,
        signatory: formData.signatory,
        tx: transactions.wrappedTx,
        coreTx: transactions.coreTx,
        route,
        signingPath: formData.signingPath,
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
  clock: confirmModel.confirmed,
  source: $addProxyStore,
  filter: (addProxyStore) => nonNullable(addProxyStore),
  fn: (_, confirms) => ({
    event: { signingPayloads: getSigningPayloads(confirms) },
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
    confirms: confirmModel.$confirmed,
  },
  filter: (proxyData) => nonNullable(proxyData.addProxyStore) && proxyData.confirms.length > 0,
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.addProxyStore!.chain!,
      account: proxyData.addProxyStore!.initiator!,
      signatory: proxyData.addProxyStore!.signatory,
      coreTxs: proxyData.confirms.map((confirm) => confirm.coreTx),
      wrappedTxs: proxyData.confirms.map((confirm) => confirm.tx),
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
  filter: (addProxyStore, results) => nonNullable(addProxyStore) && submitUtils.isSuccessResult(results[0]!.result),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  target: accountSync.syncAccounts,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { isMultisig: formModel.$isMultisig, confirms: confirmModel.$confirmed },
  filter: ({ isMultisig, confirms }, results) =>
    isMultisig && confirms.length > 0 && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ confirms }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;
    const { coreTx, tx } = confirms[0]!;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx.chainId,
      callHash: tx.args.callHash,
      multisigAccountId: coreTx.accountId,
      blockCreated: timepoint.height,
      indexCreated: timepoint.index,
    });
  },
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

wireDraftCloseRedirect({
  $initiatedDraft: formModel.$initiatedDraft,
  flowFinished,
  redirectTarget: $redirectAfterSubmitPath,
  destination: Paths.OPERATIONS,
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
    flowStarted: formModel.flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
    flowClosed,
  },
};
