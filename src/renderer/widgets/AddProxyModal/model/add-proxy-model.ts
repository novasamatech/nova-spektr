import { createEvent, createStore, sample } from 'effector';
import { spread, delay } from 'patronum';

import { Transaction, TransactionType, transactionService, TxWrapper, WrapperKind } from '@entities/transaction';
import { toAddress, toAccountId } from '@shared/lib/utils';
import { walletSelectModel } from '@features/wallets';
import { walletModel, walletUtils } from '@entities/wallet';
import { ProxyGroup, NoID, MultisigAccount, Account } from '@shared/core';
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
const $wrappedTx = createStore<Transaction | null>(null);
const $coreTx = createStore<Transaction | null>(null);
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

    const isMultisig = txWrappers.includes('multisig');
    const txWrappersAdapter: TxWrapper[] = isMultisig
      ? [
          {
            kind: WrapperKind.MULTISIG,
            multisigAccount: account as MultisigAccount,
            signatories: (account as MultisigAccount).signatories.map((s) => ({ accountId: s.accountId })) as Account[],
            signer: { accountId: signatory!.accountId } as Account,
          },
        ]
      : [];

    const transactions = transactionService.getWrappedTransaction({
      api: apis[chain.chainId],
      addressPrefix: chain.addressPrefix,
      transaction,
      txWrappers: txWrappersAdapter,
    });

    return { ...transactions, multisigTx: transactions.multisigTx || null };
  },
  target: spread({
    wrappedTx: $wrappedTx,
    coreTx: $coreTx,
    multisigTx: $multisigTx,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: $wrappedTx,
  filter: (wrappedTx: Transaction | null): wrappedTx is Transaction => Boolean(wrappedTx),
  fn: (wrappedTx, formData) => ({
    event: { ...formData, transaction: wrappedTx },
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
      account: addProxyStore!.account,
      signatory: addProxyStore!.signatory,
      transaction: wrappedTx!,
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
    txWrappers: $txWrappers,
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
      transaction: proxyData.coreTx!,
      multisigTx: proxyData.multisigTx || undefined,
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
