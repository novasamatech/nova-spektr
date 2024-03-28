import { createEvent, createStore, sample } from 'effector';
import { spread, delay } from 'patronum';

import { Transaction, TransactionType } from '@entities/transaction';
import { toAddress } from '@shared/lib/utils';
import { walletSelectModel } from '@features/wallets';
import { walletModel, walletUtils } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { balanceSubModel } from '@features/balances';
import { Step, TxWrappers, RemoveProxyStore } from '../lib/types';
import { removePureProxyUtils } from '../lib/remove-pure-proxy-utils';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { signModel } from './sign-model';
import { submitModel } from './submit-model';
import { walletProviderModel } from '../../WalletDetails/model/wallet-provider-model';
import { Chain, ProxiedAccount, ProxyType } from '@/src/renderer/shared/core';
import { warningModel } from './warning-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $removeProxyStore = createStore<RemoveProxyStore | null>(null);
const $transaction = createStore<Transaction | null>(null);
const $multisigTx = createStore<Transaction | null>(null);

const $txWrappers = createStore<TxWrappers>([]);

const $chain = $removeProxyStore.map((store) => store?.chain, { skipVoid: false });
const $account = $removeProxyStore.map((store) => store?.account, { skipVoid: false });

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  source: {
    accounts: walletProviderModel.$accounts,
    chains: networkModel.$chains,
  },
  fn: ({ accounts, chains }) => {
    const account = accounts[0] as ProxiedAccount;
    const chain = chains[account.chainId];

    return {
      chain: chains[account.chainId],
      account: account,
      spawner: toAddress(account.proxyAccountId, { prefix: chain.addressPrefix }),
      proxyType: account.proxyType,
      description: '',
    };
  },
  target: $removeProxyStore,
});

sample({
  clock: flowStarted,
  source: {
    proxies: walletProviderModel.$chainsProxies,
    chain: $chain,
  },
  fn: ({ proxies, chain }) => {
    if (!chain) return Step.WARNING;

    const chainProxies = proxies[chain!.chainId] || [];
    const anyProxies = chainProxies.filter((proxy) => proxy.proxyType === ProxyType.ANY);

    return anyProxies.length > 1 ? Step.INIT : Step.WARNING;
  },
  target: stepChanged,
});

sample({
  clock: flowStarted,
  target: warningModel.events.formInitiated,
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
  clock: warningModel.output.formSubmitted,
  fn: () => Step.INIT,
  target: $step,
});

sample({
  clock: warningModel.output.formSubmitted,
  source: {
    account: $account,
    chain: $chain,
  },
  filter: ({ account, chain }) => {
    return Boolean(account) && Boolean(chain);
  },
  fn: ({ account, chain }) => ({
    account: account as ProxiedAccount,
    chain,
  }),
  target: formModel.events.formInitiated,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
    data: $removeProxyStore,
  },
  fn: ({ wallet, wallets, data }): TxWrappers => {
    const account = data!.account as ProxiedAccount;

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
    data: $removeProxyStore,
  },
  fn: ({ txWrappers, apis, data }, formData) => {
    const account = data!.account as ProxiedAccount;
    const chain = data!.chain;

    const transaction: Transaction = {
      chainId: chain.chainId,
      address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
      type: TransactionType.REMOVE_PURE_PROXY,
      args: {
        spawner: data!.spawner,
        proxyType: data!.proxyType,
        index: 0,
        blockNumber: account.blockNumber,
        extrinsicIndex: account.extrinsicIndex,
      },
    };

    return removePureProxyUtils.getWrappedTransactions(txWrappers, transaction, {
      api: apis[chain.chainId],
      addressPrefix: chain.addressPrefix,
      account,
      signerAccountId: formData.signatory?.accountId,
    });
  },
  target: spread({
    transaction: $transaction,
    multisigTx: $multisigTx,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: { transaction: $transaction, chain: $chain, account: $account },
  filter: ({ transaction, chain, account }) => Boolean(transaction) && Boolean(chain) && Boolean(account),
  fn: ({ transaction, chain, account }, formData) => ({
    event: {
      ...formData,
      chain: chain as Chain,
      account: account as ProxiedAccount,
      transaction: transaction as Transaction,
      spawner: (account as ProxiedAccount).proxyAccountId,
      proxyType: ProxyType.ANY,
    },
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
    removeProxyStore: $removeProxyStore,
    transaction: $transaction,
  },
  filter: ({ removeProxyStore, transaction }) => Boolean(removeProxyStore) && Boolean(transaction),
  fn: ({ removeProxyStore, transaction }) => ({
    event: {
      chain: removeProxyStore!.chain,
      account: removeProxyStore!.account,
      signatory: removeProxyStore!.signatory,
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
    removeProxyStore: $removeProxyStore,
    transaction: $transaction,
    multisigTx: $multisigTx,
    txWrappers: $txWrappers,
  },
  filter: (proxyData) => {
    const isMultisigRequired = !removePureProxyUtils.hasMultisig(proxyData.txWrappers) || Boolean(proxyData.multisigTx);

    return Boolean(proxyData.removeProxyStore) && Boolean(proxyData.transaction) && isMultisigRequired;
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.removeProxyStore!.chain,
      account: proxyData.removeProxyStore!.account,
      signatory: proxyData.removeProxyStore!.signatory,
      description: proxyData.removeProxyStore!.description,
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

export const removePureProxyModel = {
  $step,
  $chain,
  $account,
  events: {
    flowStarted,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
