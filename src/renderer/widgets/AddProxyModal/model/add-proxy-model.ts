import { createEvent, createStore, sample } from 'effector';
import { spread, delay } from 'patronum';

import { Transaction, TransactionType, transactionService } from '@entities/transaction';
import { toAddress, toAccountId } from '@shared/lib/utils';
import { walletSelectModel } from '@features/wallets';
import { walletModel, walletUtils } from '@entities/wallet';
import type { ProxyGroup, NoID } from '@shared/core';
import { proxyModel, proxyUtils } from '@entities/proxy';
import { networkModel } from '@entities/network';
import { balanceSubModel } from '@features/balances';
import { Step, TxWrappers, AddProxyStore } from '../lib/types';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { signModel } from './sign-model';
import { submitModel } from './submit-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $addProxyStore = createStore<AddProxyStore | null>(null);
const $transaction = createStore<Transaction | null>(null);
const $multisigTx = createStore<Transaction | null>(null);

const $txWrappers = createStore<TxWrappers>([]);

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
  target: $addProxyStore,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  fn: ({ wallet, wallets }, { account }): TxWrappers => {
    if (!wallet) return [];
    if (walletUtils.isMultisig(wallet)) return ['multisig'];
    if (!walletUtils.isProxied(wallet)) return [];

    const accountWallet = walletUtils.getWalletById(wallets, account.walletId);

    return walletUtils.isMultisig(accountWallet) ? ['multisig', 'proxy'] : ['proxy'];
  },
  target: $txWrappers,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    txWrappers: $txWrappers,
    apis: networkModel.$apis,
  },
  fn: ({ txWrappers, apis }, formData) => {
    const { chain, account, signatory, delegate, proxyType } = formData;

    const transaction: Transaction = {
      chainId: chain.chainId,
      address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
      type: TransactionType.ADD_PROXY,
      args: { delegate, proxyType, delay: 0 },
    };

    return transactionService.getWrappedTransactions(txWrappers, transaction, {
      api: apis[chain.chainId],
      addressPrefix: chain.addressPrefix,
      account,
      signerAccountId: signatory?.accountId,
    });
  },
  target: spread({
    transaction: $transaction,
    multisigTx: $multisigTx,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: $transaction,
  filter: (transaction: Transaction | null): transaction is Transaction => Boolean(transaction),
  fn: (transaction, formData) => ({
    event: { ...formData, transaction },
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
    transaction: $transaction,
  },
  filter: ({ addProxyStore, transaction }) => Boolean(addProxyStore) && Boolean(transaction),
  fn: ({ addProxyStore, transaction }) => ({
    event: {
      chain: addProxyStore!.chain,
      account: addProxyStore!.account,
      signatory: addProxyStore!.signatory,
      transaction: transaction!,
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
    transaction: $transaction,
    multisigTx: $multisigTx,
    txWrappers: $txWrappers,
  },
  filter: (proxyData) => {
    const isMultisigRequired = !transactionService.hasMultisig(proxyData.txWrappers) || Boolean(proxyData.multisigTx);

    return Boolean(proxyData.addProxyStore) && Boolean(proxyData.transaction) && isMultisigRequired;
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.addProxyStore!.chain,
      account: proxyData.addProxyStore!.account,
      signatory: proxyData.addProxyStore!.signatory,
      description: proxyData.addProxyStore!.description,
      transaction: proxyData.transaction!,
      multisigTx: proxyData.multisigTx!,
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

    const proxyGroupExists = proxyGroups.some((group) => proxyUtils.isSameProxyGroup(group, newProxyGroup));

    return proxyGroupExists ? { groupsUpdated: [newProxyGroup] } : { groupsAdded: [newProxyGroup] };
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
