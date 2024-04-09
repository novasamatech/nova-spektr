import { combine, createEvent, createStore, sample } from 'effector';
import { spread, delay } from 'patronum';

import { Transaction, TransactionType, transactionService } from '@entities/transaction';
import { dictionary, toAddress } from '@shared/lib/utils';
import { walletSelectModel } from '@features/wallets';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { balanceSubModel } from '@features/balances';
import { Step, RemoveProxyStore } from '../lib/types';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { walletProviderModel } from '../../WalletDetails/model/wallet-provider-model';
import { Chain, ProxiedAccount, ProxyAccount, ProxyType, ProxyVariant } from '@shared/core';
import { warningModel } from './warning-model';
import { proxyModel } from '@entities/proxy';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';

const stepChanged = createEvent<Step>();

type Input = {
  account: ProxiedAccount;
  proxy: ProxyAccount;
};
const flowStarted = createEvent<Input>();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $removeProxyStore = createStore<RemoveProxyStore | null>(null).reset(flowFinished);

const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);

const $chain = $removeProxyStore.map((store) => store?.chain, { skipVoid: false });
const $account = $removeProxyStore.map((store) => store?.account, { skipVoid: false });

const $txWrappers = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    account: $account,
    chain: $chain,
  },
  ({ wallet, account, accounts, wallets, chain }) => {
    if (!wallet || !chain || !account) return [];

    const walletFiltered = wallets.filter((wallet) => {
      return !walletUtils.isProxied(wallet) && !walletUtils.isWatchOnly(wallet);
    });
    const walletsMap = dictionary(walletFiltered, 'id');
    const chainFilteredAccounts = accounts.filter((account) => {
      if (accountUtils.isBaseAccount(account) && walletUtils.isPolkadotVault(walletsMap[account.walletId])) {
        return false;
      }

      return accountUtils.isChainAndCryptoMatch(account, chain);
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: walletFiltered,
      account,
      accounts: chainFilteredAccounts,
      signatories: [],
    });
  },
);

const $shouldRemovePureProxy = combine(
  {
    proxies: walletProviderModel.$chainsProxies,
    account: $account,
    chain: $chain,
  },
  ({ proxies, account, chain }) => {
    if (!chain || !account) return true;

    const chainProxies = proxies[chain.chainId] || [];
    const anyProxies = chainProxies.filter((proxy) => proxy.proxyType === ProxyType.ANY);
    const isPureProxy = (account as ProxiedAccount).proxyVariant === ProxyVariant.PURE;

    return isPureProxy && anyProxies.length === 1;
  },
);

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  source: {
    chains: networkModel.$chains,
  },
  fn: ({ chains }, { proxy, account }) => {
    const chain = chains[account.chainId];

    return {
      chain: chains[account.chainId],
      account: account!,
      spawner: toAddress(proxy.accountId, { prefix: chain.addressPrefix }),
      proxyType: proxy.proxyType,
      description: '',
    };
  },
  target: $removeProxyStore,
});

sample({
  clock: flowStarted,
  fn: () => Step.WARNING,
  target: stepChanged,
});

sample({
  clock: flowStarted,
  source: {
    shouldRemovePureProxy: $shouldRemovePureProxy,
  },
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
  source: {
    account: $account,
    chain: $chain,
  },
  filter: ({ account, chain }) => {
    return Boolean(account) && Boolean(chain);
  },
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
    txWrappers: $txWrappers,
    apis: networkModel.$apis,
    data: $removeProxyStore,
    shouldRemovePureProxy: $shouldRemovePureProxy,
  },
  fn: ({ txWrappers, apis, data, shouldRemovePureProxy }) => {
    const account = data!.account as ProxiedAccount;
    const chain = data!.chain;

    const type = shouldRemovePureProxy ? TransactionType.REMOVE_PURE_PROXY : TransactionType.REMOVE_PROXY;
    const args =
      type === TransactionType.REMOVE_PURE_PROXY
        ? {
            spawner: data!.spawner,
            proxyType: data!.proxyType,
            index: 0,
            height: account.blockNumber,
            extIndex: account.extrinsicIndex,
          }
        : {
            delegate: data!.spawner,
            proxyType: data!.proxyType,
            delay: 0,
          };

    const transaction: Transaction = {
      chainId: chain.chainId,
      address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
      type,
      args,
    };

    return transactionService.getWrappedTransaction({
      api: apis[chain.chainId],
      addressPrefix: chain.addressPrefix,
      transaction,
      txWrappers,
    });
  },
  target: spread({
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: { wrappedTx: $wrappedTx, chain: $chain, account: $account },
  filter: ({ wrappedTx, chain, account }) => {
    return Boolean(wrappedTx) && Boolean(chain) && Boolean(account);
  },
  fn: ({ wrappedTx, chain, account }, formData) => ({
    event: {
      ...formData,
      chain: chain as Chain,
      account: account as ProxiedAccount,
      transaction: wrappedTx as Transaction,
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
    wrappedTx: $wrappedTx,
  },
  filter: ({ removeProxyStore, wrappedTx }) => Boolean(removeProxyStore) && Boolean(wrappedTx),
  fn: ({ removeProxyStore, wrappedTx }) => ({
    event: {
      chain: removeProxyStore!.chain,
      accounts: [removeProxyStore!.account],
      signatory: removeProxyStore!.signatory,
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
    removeProxyStore: $removeProxyStore,
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    txWrappers: $txWrappers,
  },
  filter: (proxyData) => {
    return Boolean(proxyData.removeProxyStore) && Boolean(proxyData.wrappedTx);
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.removeProxyStore!.chain,
      account: proxyData.removeProxyStore!.account,
      signatory: proxyData.removeProxyStore!.signatory,
      description: proxyData.removeProxyStore!.description,
      transactions: [proxyData.wrappedTx!],
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
  source: {
    chain: $chain,
    account: $account,
    chainProxies: walletProviderModel.$chainsProxies,
  },
  filter: ({ chain, account }) => Boolean(chain) && Boolean(account),
  fn: ({ chainProxies, account, chain }) => {
    const proxy = chainProxies[chain!.chainId].find(
      (proxy) =>
        proxy.accountId === (account as ProxiedAccount).proxyAccountId &&
        proxy.proxyType === (account as ProxiedAccount).proxyType &&
        proxy.proxiedAccountId === account!.accountId,
    );

    return proxy ? [proxy] : [];
  },
  target: proxyModel.events.proxiesRemoved,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    wallet: walletSelectModel.$walletForDetails,
    chainProxies: walletProviderModel.$chainsProxies,
    removeProxyStore: $removeProxyStore,
  },
  filter: ({ chainProxies, wallet, removeProxyStore }) => {
    const proxies = Object.values(chainProxies).flat();

    return Boolean(wallet) && Boolean(removeProxyStore) && proxies.length === 1;
  },
  fn: ({ wallet }) => wallet!.id,
  target: walletModel.events.walletRemoved,
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
  $shouldRemovePureProxy,

  events: {
    flowStarted,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
