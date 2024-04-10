import { createEvent, createStore, sample } from 'effector';
import { spread, delay } from 'patronum';

import { Transaction } from '@entities/transaction';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { walletSelectModel } from '@features/wallets';
import { walletModel } from '@entities/wallet';
import { balanceSubModel } from '@features/balances';
import { Step, AddProxyStore } from '../lib/types';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { proxyModel, proxyUtils } from '@entities/proxy';
import { NoID, ProxyGroup } from '@shared/core';
import { toAccountId } from '@shared/lib/utils';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $addProxyStore = createStore<AddProxyStore | null>(null).reset(flowFinished);
const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: flowStarted,
  source: {
    activeWallet: walletModel.$activeWallet,
    walletDetails: walletSelectModel.$walletForDetails,
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
  target: formModel.events.formInitiated,
});

sample({
  clock: formModel.output.formSubmitted,
  fn: ({ transactions, formData }) => ({
    wrappedTx: transactions.wrappedTx,
    multisigTx: transactions.multisigTx || null,
    coreTx: transactions.coreTx,
    store: formData,
  }),
  target: spread({
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
    store: $addProxyStore,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  fn: ({ formData, transactions }) => ({
    event: { ...formData, transaction: transactions.wrappedTx },
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
    addProxyStore: $addProxyStore,
    wrappedTx: $wrappedTx,
  },
  filter: ({ addProxyStore, wrappedTx }) => Boolean(addProxyStore) && Boolean(wrappedTx),
  fn: ({ addProxyStore, wrappedTx }) => ({
    event: {
      chain: addProxyStore!.chain,
      accounts: [addProxyStore!.account],
      signatory: addProxyStore!.signatory,
      transactions: [wrappedTx!],
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
    multisigTx: $multisigTx,
  },
  filter: (proxyData) => {
    return Boolean(proxyData.addProxyStore) && Boolean(proxyData.coreTx);
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.addProxyStore!.chain,
      account: proxyData.addProxyStore!.account,
      signatory: proxyData.addProxyStore!.signatory,
      description: proxyData.addProxyStore!.description,
      transactions: [proxyData.coreTx!],
      multisigTxs: proxyData.multisigTx ? [proxyData.multisigTx] : [],
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
  filter: (addProxyStore: AddProxyStore | null): addProxyStore is AddProxyStore => Boolean(addProxyStore),
  fn: (addProxyStore) => [
    {
      accountId: toAccountId(addProxyStore.delegate),
      proxiedAccountId: addProxyStore.account.accountId,
      chainId: addProxyStore.chain.chainId,
      proxyType: addProxyStore.proxyType,
      delay: 0,
    },
  ],
  target: proxyModel.events.proxiesAdded,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    wallet: walletSelectModel.$walletForDetails,
    addProxyStore: $addProxyStore,
    proxyGroups: proxyModel.$proxyGroups,
  },
  filter: ({ wallet, addProxyStore }) => Boolean(wallet) && Boolean(addProxyStore),
  fn: ({ wallet, addProxyStore, proxyGroups }) => {
    const newProxyGroup: NoID<ProxyGroup> = {
      walletId: wallet!.id,
      chainId: addProxyStore!.chain.chainId,
      proxiedAccountId: addProxyStore!.account.accountId,
      totalDeposit: addProxyStore!.proxyDeposit,
    };

    const existingProxyGroup = proxyGroups.find((group) => proxyUtils.isSameProxyGroup(group, newProxyGroup));

    return existingProxyGroup
      ? { groupsUpdated: [{ id: existingProxyGroup.id, ...newProxyGroup }] }
      : { groupsAdded: [newProxyGroup] };
  },
  target: spread({
    groupsAdded: proxyModel.events.proxyGroupsAdded,
    groupsUpdated: proxyModel.events.proxyGroupsUpdated,
  }),
});

sample({
  clock: delay(submitModel.output.formSubmitted, 2000),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  source: {
    activeWallet: walletModel.$activeWallet,
    walletDetails: walletSelectModel.$walletForDetails,
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
  fn: () => Step.NONE,
  target: stepChanged,
});

export const addProxyModel = {
  $step,
  $chain: $addProxyStore.map((store) => store?.chain, { skipVoid: false }),
  events: {
    flowStarted,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
