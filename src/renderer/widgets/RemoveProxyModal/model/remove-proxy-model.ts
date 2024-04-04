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
import { Chain, ProxiedAccount, ProxyType, ProxyVariant } from '@shared/core';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { proxyModel } from '@/src/renderer/entities/proxy';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $removeProxyStore = createStore<RemoveProxyStore | null>(null);
const $transaction = createStore<Transaction | null>(null);
const $multisigTx = createStore<Transaction | null>(null);

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
    proxyAccount: walletProviderModel.$proxyForRemoval,
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
    allAccounts: walletModel.$accounts,
  },
  filter: ({ proxyAccount }) => Boolean(proxyAccount),
  fn: ({ chains, proxyAccount, allAccounts }) => {
    const chain = chains[proxyAccount!.chainId];

    const signerAccount = allAccounts.find((a) => a.accountId === proxyAccount!.accountId);
    const account = allAccounts.find(
      (a) => accountUtils.isProxiedAccount(a) && a.accountId === proxyAccount!.proxiedAccountId,
    );

    const store = {
      chain: chain!,
      account: account!,
      delegate: toAddress(proxyAccount!.accountId!, { prefix: chain!.addressPrefix }),
      proxyType: proxyAccount!.proxyType,
      delay: proxyAccount!.delay,
      description: '',
      signatory: signerAccount,
    };

    return store;
  },
  target: $removeProxyStore,
});

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
  },
  fn: ({ txWrappers, apis, data }, formData) => {
    const account = data!.account as ProxiedAccount;
    const chain = data!.chain;

    const transaction: Transaction = {
      chainId: chain.chainId,
      address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
      type: TransactionType.REMOVE_PROXY,
      args: {
        delegate: data!.delegate,
        proxyType: data!.proxyType,
        delay: 0,
      },
    };

    return transactionService.getWrappedTransaction({
      api: apis[chain.chainId],
      addressPrefix: chain.addressPrefix,
      transaction,
      txWrappers,
    });
  },
  target: spread({
    wrappedTx: $transaction,
    multisigTx: $multisigTx,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: { transaction: $transaction, chain: $chain, account: $account },
  filter: ({ transaction, chain, account }) => {
    return Boolean(transaction) && Boolean(chain) && Boolean(account);
  },
  fn: ({ transaction, chain, account }, formData) => ({
    event: {
      ...formData,
      chain: chain as Chain,
      account: account as ProxiedAccount,
      transaction: transaction as Transaction,
      delegate: (account as ProxiedAccount).proxyAccountId,
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
      accounts: [removeProxyStore!.account],
      signatory: removeProxyStore!.signatory,
      transactions: [transaction!],
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
    const isMultisigRequired = !transactionService.hasMultisig(proxyData.txWrappers) || Boolean(proxyData.multisigTx);

    return Boolean(proxyData.removeProxyStore) && Boolean(proxyData.transaction) && isMultisigRequired;
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.removeProxyStore!.chain,
      account: proxyData.removeProxyStore!.account,
      signatory: proxyData.removeProxyStore!.signatory,
      description: proxyData.removeProxyStore!.description,
      transactions: [proxyData.transaction!],
      multisigTxs: [proxyData.multisigTx!],
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
  },
  filter: ({ chainProxies, wallet }) => {
    const proxies = Object.values(chainProxies).flat();

    return Boolean(wallet) && proxies.length === 1;
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

export const removeProxyModel = {
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
