import { combine, createEvent, createStore, sample } from 'effector';
import { spread, delay } from 'patronum';

import {
  Transaction,
  TransactionType,
  MultisigTxWrapper,
  ProxyTxWrapper,
  TxWrapper,
  WrapperKind,
  transactionService,
} from '@entities/transaction';
import { dictionary, toAccountId, toAddress, transferableAmount } from '@shared/lib/utils';
import { walletSelectModel } from '@features/wallets';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { balanceSubModel } from '@features/balances';
import { Step, RemoveProxyStore } from '../lib/types';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { walletProviderModel } from '../../WalletDetails/model/wallet-provider-model';
import { Account, Chain, ProxiedAccount, ProxyAccount, ProxyType, ProxyVariant } from '@shared/core';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel } from '@features/operations/OperationSubmit';
import { proxyModel } from '@entities/proxy';
import { balanceModel, balanceUtils } from '@entities/balance';

const stepChanged = createEvent<Step>();

type Input = {
  account: Account;
  proxy: ProxyAccount;
};
const flowStarted = createEvent<Input>();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $removeProxyStore = createStore<RemoveProxyStore | null>(null);
const $transaction = createStore<Transaction | null>(null);
const $multisigTx = createStore<Transaction | null>(null);

const $availableSignatories = createStore<Account[][]>([]);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);
const $selectedSignatories = createStore<Account[]>([]);

const $chain = $removeProxyStore.map((store) => store?.chain, { skipVoid: false });
const $account = $removeProxyStore.map((store) => store?.account, { skipVoid: false });

const $txWrappers = combine(
  {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
    account: $account,
    chain: $chain,
    signatories: $selectedSignatories,
  },
  ({ wallet, account, accounts, wallets, chain, signatories }) => {
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
      signatories,
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

const $realAccount = combine(
  {
    txWrappers: $txWrappers,
    account: $account,
  },
  ({ txWrappers, account }) => {
    if (txWrappers.length === 0) return account;

    if (transactionService.hasMultisig([txWrappers[0]])) {
      return (txWrappers[0] as MultisigTxWrapper).multisigAccount;
    }

    return (txWrappers[0] as ProxyTxWrapper).proxyAccount;
  },
);

const $signatories = combine(
  {
    chain: $chain,
    availableSignatories: $availableSignatories,
    balances: balanceModel.$balances,
  },
  ({ chain, availableSignatories, balances }) => {
    if (!chain) return [];

    return availableSignatories.reduce<Array<{ signer: Account; balance: string }[]>>((acc, signatories) => {
      const balancedSignatories = signatories.map((signatory) => {
        const balance = balanceUtils.getBalance(
          balances,
          signatory.accountId,
          chain.chainId,
          chain.assets[0].assetId.toString(),
        );

        return { signer: signatory, balance: transferableAmount(balance) };
      });

      acc.push(balancedSignatories);

      return acc;
    }, []);
  },
);

sample({
  clock: $txWrappers,
  fn: (txWrappers: TxWrapper[]) => {
    const signatories = txWrappers.reduce<Account[][]>((acc, wrapper) => {
      if (wrapper.kind === WrapperKind.MULTISIG) acc.push(wrapper.signatories);

      return acc;
    }, []);

    return {
      signatories,
      isProxy: transactionService.hasProxy(txWrappers),
      isMultisig: transactionService.hasMultisig(txWrappers),
    };
  },
  target: spread({
    signatories: $availableSignatories,
    isProxy: $isProxy,
    isMultisig: $isMultisig,
  }),
});

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  source: {
    proxyAccount: walletProviderModel.$proxyForRemoval,
    selectedWallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
    allAccounts: walletModel.$accounts,
  },
  filter: ({ proxyAccount }) => Boolean(proxyAccount),
  fn: ({ chains }, { proxy, account }) => {
    const chain = chains[proxy!.chainId];

    const store = {
      chain: chain!,
      account,
      delegate: toAddress(proxy!.accountId!, { prefix: chain!.addressPrefix }),
      proxyType: proxy!.proxyType,
      delay: proxy!.delay,
      description: '',
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
    realAccount: $realAccount,
    chain: $chain,
    signatories: $signatories,
  },
  filter: ({ account, realAccount, chain }) => {
    return Boolean(account) && Boolean(realAccount) && Boolean(chain);
  },
  fn: ({ account, realAccount, chain, signatories }) => ({
    account: realAccount,
    proxiedAccount: account as ProxiedAccount,
    chain,
    signatories: signatories[0] || [],
  }),
  target: formModel.events.formInitiated,
});

sample({
  clock: formModel.output.formSubmitted,
  filter: ({ signatory }) => Boolean(signatory),
  fn: ({ signatory }) => [signatory!],
  target: $selectedSignatories,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    txWrappers: $txWrappers,
    apis: networkModel.$apis,
    data: $removeProxyStore,
  },
  fn: ({ txWrappers, apis, data }) => {
    const account = data!.account;
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
  source: { transaction: $transaction, chain: $chain, account: $account, store: $removeProxyStore },
  filter: ({ transaction, chain, account, store }) => {
    return Boolean(transaction) && Boolean(chain) && Boolean(account) && Boolean(store);
  },
  fn: ({ transaction, chain, account, store }, formData) => ({
    event: {
      ...formData,
      chain: chain as Chain,
      account,
      transaction: transaction as Transaction,
      delegate: store!.delegate,
      proxyType: store!.proxyType,
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
    signatories: $selectedSignatories,
  },
  filter: ({ removeProxyStore, transaction }) => Boolean(removeProxyStore) && Boolean(transaction),
  fn: ({ removeProxyStore, signatories, transaction }) => ({
    event: {
      chain: removeProxyStore!.chain,
      accounts: [removeProxyStore!.account],
      signatory: signatories?.[0],
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
    store: $removeProxyStore,
    chainProxies: walletProviderModel.$chainsProxies,
  },
  fn: ({ store, chainProxies }) => {
    const proxy = chainProxies[store!.chain.chainId].find(
      (proxy) =>
        proxy.accountId === toAccountId(store!.delegate) &&
        proxy.proxyType === store!.proxyType &&
        proxy.proxiedAccountId === store!.account.accountId,
    );

    return proxy ? [proxy] : [];
  },
  target: proxyModel.events.proxiesRemoved,
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
  $realAccount,
  $isMultisig,
  $isProxy,
  $signatories,

  events: {
    flowStarted,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
