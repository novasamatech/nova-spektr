import { combine, createEvent, createStore, restore, sample, split } from 'effector';
import { spread } from 'patronum';

import {
  type BasketTransaction,
  type Chain,
  type ChainId,
  type MultisigTxWrapper,
  type ProxiedAccount,
  type ProxyAccount,
  type ProxyTxWrapper,
  ProxyVariant,
  type Transaction,
  TransactionType,
  type TxWrapper,
  WrapperKind,
} from '@/shared/core';
import { nonNullable, nullable, toAccountId, toAddress, transferableAmount } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { type AnyAccount } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { basketModel } from '@/entities/basket';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { balanceSubModel } from '@/features/assets-balances';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { removeProxyConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm/RemoveProxy';
import { proxiesModel } from '@/features/proxies';
import { removeProxyUtils } from '../lib/remove-proxy-utils';
import { type RemoveProxyStore, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();
const wentBackFromConfirm = createEvent();
const stepChangedToInit = stepChanged.prepend(() => Step.INIT);

type Input = {
  account: AnyAccount;
  proxy: ProxyAccount;
};
const flowStarted = createEvent<Input>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $removeProxyStore = createStore<RemoveProxyStore | null>(null);
const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);

const $availableSignatories = createStore<AnyAccount[][]>([]);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);
const $selectedSignatories = createStore<AnyAccount[]>([]);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $chain = $removeProxyStore.map((store) => store?.chain, { skipVoid: false });
const $account = $removeProxyStore.map((store) => store?.account, { skipVoid: false });

const removeProxy = createEvent<ProxyAccount>();

const $proxyForRemoval = restore(removeProxy, null);

const $chainProxies = combine(
  {
    wallet: formModel.$wallet,
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
  },
  ({ wallet, chains, proxies }): Record<ChainId, ProxyAccount[]> => {
    if (nullable(wallet)) return {};

    return proxyUtils.getProxyAccountsOnChain(wallet.accounts, Object.keys(chains) as ChainId[], proxies);
  },
);

const $txWrappers = combine(
  {
    wallet: formModel.$wallet,
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
        const isBase = accountUtils.isVaultBaseAccount(a);
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

const $shouldRemovePureProxy = combine(
  {
    proxies: $chainProxies,
    account: $account,
    chain: $chain,
  },
  ({ proxies, account, chain }) => {
    if (!chain || !account) return true;

    const chainProxies = proxies[chain.chainId] || [];
    const anyProxies = chainProxies.filter((proxy) => proxy.proxyType === 'Any');
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

    return availableSignatories.reduce<{ signer: AnyAccount; balance: string }[][]>((acc, signatories) => {
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
    const signatories = txWrappers.reduce<AnyAccount[][]>((acc, wrapper) => {
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
    proxyAccount: $proxyForRemoval,
    chains: networkModel.$chains,
  },
  filter: ({ proxyAccount }) => Boolean(proxyAccount),
  fn: ({ chains }, { proxy, account }) => {
    const chain = chains[proxy!.chainId];

    return {
      chain: chain!,
      account,
      delegate: toAddress(proxy!.accountId!, { prefix: chain!.addressPrefix }),
      proxyType: proxy!.proxyType,
      delay: proxy!.delay,
    };
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
    store: $removeProxyStore,
  },
  filter: ({ wrappedTx, chain, realAccount, account, store }) => {
    return Boolean(wrappedTx) && Boolean(chain) && Boolean(realAccount) && Boolean(account) && Boolean(store);
  },
  fn: ({ wrappedTx, coreTx, chain, account, realAccount, store }, formData) => ({
    event: [
      {
        ...formData,
        chain: chain as Chain,
        account: realAccount,
        proxiedAccount: accountUtils.isProxiedAccount(account!) ? account : undefined,
        transaction: wrappedTx as Transaction,
        delegate: store!.delegate,
        proxyType: store!.proxyType,
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
    signatories: $selectedSignatories,
  },
  filter: ({ removeProxyStore, wrappedTx }) => Boolean(removeProxyStore) && Boolean(wrappedTx),
  fn: ({ removeProxyStore, signatories, wrappedTx }) => ({
    event: {
      signingPayloads: [
        {
          chain: removeProxyStore!.chain,
          account: removeProxyStore!.account,
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
    coreTx: $coreTx,
    multisigTx: $multisigTx,
    txWrappers: $txWrappers,
  },
  filter: (proxyData) => {
    const isMultisigRequired = !transactionService.hasMultisig(proxyData.txWrappers) || Boolean(proxyData.multisigTx);

    return Boolean(proxyData.removeProxyStore) && Boolean(proxyData.wrappedTx) && isMultisigRequired;
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
    store: $removeProxyStore,
    chainProxies: $chainProxies,
  },
  filter: ({ step }) => removeProxyUtils.isSubmitStep(step),
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
  target: proxiesModel.events.workerStarted,
});

sample({
  clock: flowFinished,
  target: $proxyForRemoval.reinit,
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

export const removeProxyModel = {
  $proxyForRemoval,
  $step,
  $chain,
  $account,
  $shouldRemovePureProxy,
  $realAccount,
  $isMultisig,
  $isProxy,
  $signatories,
  $initiatorWallet,

  events: {
    removeProxy,
    flowStarted,
    stepChanged,
    wentBackFromConfirm,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
