import { combine, createEvent, createStore, sample, split } from 'effector';
import { spread } from 'patronum';

import {
  type Account,
  type BasketTransaction,
  type Chain,
  type MultisigTxWrapper,
  type ProxiedAccount,
  type ProxyAccount,
  type ProxyTxWrapper,
  ProxyType,
  ProxyVariant,
  type Transaction,
  TransactionType,
  type TxWrapper,
  WrapperKind,
} from '@/shared/core';
import { nonNullable, toAddress, transferableAmount } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { basketModel } from '@/entities/basket';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { balanceSubModel } from '@/features/balances';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { removePureProxiedConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { walletSelectModel } from '@/features/wallets';
import { walletProviderModel } from '@/widgets/WalletDetails';
import { removePureProxyUtils } from '../lib/remove-pure-proxy-utils';
import { type RemoveProxyStore, Step } from '../lib/types';

import { formModel } from './form-model';
import { warningModel } from './warning-model';

const stepChanged = createEvent<Step>();
const wentBackFromConfirm = createEvent();
const stepChangedToInit = stepChanged.prepend(() => Step.INIT);

type Input = {
  account: ProxiedAccount;
  proxy: ProxyAccount;
};
const flowStarted = createEvent<Input>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $removeProxyStore = createStore<RemoveProxyStore | null>(null).reset(flowFinished);

const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

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
    account: $account,
    chain: $chain,
    signatories: $selectedSignatories,
  },
  ({ wallet, account, wallets, chain, signatories }) => {
    if (!wallet || !chain || !account) return [];

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
      accountFn: (a, w) => {
        const isBase = accountUtils.isBaseAccount(a);
        const isPolkadotVault = walletUtils.isPolkadotVault(w);

        return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
      },
    });

    return transactionService.getTxWrappers({
      wallet,
      wallets: filteredWallets || [],
      account,
      signatories,
    });
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
  { skipVoid: false },
);

const $signatories = combine(
  {
    chain: $chain,
    availableSignatories: $availableSignatories,
    balances: balanceModel.$balances,
  },
  ({ chain, availableSignatories, balances }) => {
    if (!chain) return [];

    return availableSignatories.reduce<{ signer: Account; balance: string }[][]>((acc, signatories) => {
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

const $initiatorWallet = combine(
  {
    store: $removeProxyStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.account.walletId);
  },
  { skipVoid: false },
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

split({
  clock: wentBackFromConfirm,
  source: $isMultisig,
  match: {
    multisigWallet: (isMultisig) => isMultisig,
  },
  cases: {
    multisigWallet: stepChangedToInit,
    __: flowFinished,
  },
});

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
      proxiedAccount: account!,
      spawner: toAddress(proxy.accountId, { prefix: chain.addressPrefix }),
      proxyType: proxy.proxyType,
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
    realAccount: $realAccount,
    signatories: $signatories,
    account: $account,
    chain: $chain,
  },
  filter: ({ realAccount, account, chain }) => {
    return Boolean(account) && Boolean(realAccount) && Boolean(chain);
  },
  fn: ({ realAccount, signatories, account, chain }) => ({
    account: realAccount,
    proxiedAccount: account as ProxiedAccount,
    signatories: signatories[0] || [],
    chain,
  }),
  target: formModel.events.formInitiated,
});

sample({
  clock: formModel.output.formSubmitted,
  filter: ({ signatory }) => nonNullable(signatory),
  fn: ({ signatory }) => [signatory!],
  target: $selectedSignatories,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    txWrappers: $txWrappers,
    apis: networkModel.$apis,
    data: $removeProxyStore,
    shouldRemovePureProxy: $shouldRemovePureProxy,
  },
  filter: ({ data }) => Boolean(data?.account) && Boolean(data!.chain),
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
    coreTx: $coreTx,
    multisigTx: $multisigTx,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    wrappedTx: $wrappedTx,
    coreTx: $coreTx,
    chain: $chain,
    account: $account,
    realAccount: $realAccount,
  },
  filter: ({ wrappedTx, chain, account }) => {
    return Boolean(wrappedTx) && Boolean(chain) && Boolean(account);
  },
  fn: ({ wrappedTx, coreTx, chain, realAccount, account }, formData) => ({
    event: [
      {
        ...formData,
        chain: chain as Chain,
        account: realAccount,
        proxiedAccount: account as ProxiedAccount,
        transaction: wrappedTx as Transaction,
        spawner: (account as ProxiedAccount).proxyAccountId,
        proxyType: ProxyType.ANY,
        coreTx,
      },
    ],
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
    realAccount: $realAccount,
    signatories: $selectedSignatories,
  },
  filter: ({ removeProxyStore, wrappedTx, realAccount }) => {
    return Boolean(removeProxyStore) && Boolean(wrappedTx) && Boolean(realAccount);
  },
  fn: ({ removeProxyStore, signatories, wrappedTx, realAccount }) => ({
    event: {
      signingPayloads: [
        {
          chain: removeProxyStore!.chain,
          account: realAccount!,
          signatory: signatories?.[0],
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
    removeProxyStore: $removeProxyStore,
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
    txWrappers: $txWrappers,
  },
  filter: (proxyData) => {
    return Boolean(proxyData.removeProxyStore) && Boolean(proxyData.wrappedTx) && Boolean(proxyData.coreTx);
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.removeProxyStore!.chain,
      account: proxyData.removeProxyStore!.account,
      signatory: proxyData.removeProxyStore!.signatory,
      wrappedTxs: [proxyData.wrappedTx!],
      coreTxs: [proxyData.coreTx!],
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
    step: $step,
    chain: $chain,
    account: $account,
    chainProxies: walletProviderModel.$chainsProxies,
  },
  filter: ({ step, chain, account }) => {
    return removePureProxyUtils.isSubmitStep(step) && Boolean(chain) && Boolean(account);
  },
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
    step: $step,
    wallet: walletSelectModel.$walletForDetails,
    chainProxies: walletProviderModel.$chainsProxies,
    removeProxyStore: $removeProxyStore,
  },
  filter: ({ step, chainProxies, wallet, removeProxyStore }) => {
    const proxies = Object.values(chainProxies).flat();

    return (
      removePureProxyUtils.isSubmitStep(step) && Boolean(wallet) && Boolean(removeProxyStore) && proxies.length === 1
    );
  },
  fn: ({ wallet }) => wallet!.id,
  target: walletModel.events.walletRemoved,
});

sample({
  clock: txSaved,
  source: {
    store: $removeProxyStore,
    coreTx: $coreTx,
    txWrappers: $txWrappers,
  },
  filter: ({ store, coreTx, txWrappers }) => {
    return Boolean(store) && Boolean(coreTx) && Boolean(txWrappers);
  },
  fn: ({ store, coreTx, txWrappers }) => {
    const tx = {
      initiatorWallet: store!.account.walletId,
      coreTx,
      txWrappers,
    } as BasketTransaction;

    return [tx];
  },
  target: basketModel.events.transactionsCreated,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
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

export const removePureProxyModel = {
  $step,
  $chain,
  $account,
  $realAccount,
  $isMultisig,
  $shouldRemovePureProxy,
  $initiatorWallet,

  events: {
    flowStarted,
    stepChanged,
    wentBackFromConfirm,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
