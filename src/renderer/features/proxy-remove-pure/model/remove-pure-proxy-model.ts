import { combine, createEvent, createStore, restore, sample, split } from 'effector';
import { spread } from 'patronum';

import { type ChainId, type ProxiedAccount, type ProxyAccount } from '@/shared/core';
import { nonNullable, nullable, toAccountId, toAddress } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { balanceSubModel } from '@/features/assets-balances';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type RemovePureProxiedConfirm,
  removePureProxiedConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm/RemovePureProxied';
import { removePureProxyUtils } from '../lib/remove-pure-proxy-utils';
import { type RemoveProxyStore, Step } from '../lib/types';

import { formModel } from './form-model';
import { warningModel } from './warning-model';

const stepChanged = createEvent<Step>();
const wentBackFromConfirm = createEvent();
const stepChangedToInit = stepChanged.prepend(() => Step.INIT);

type Input = {
  proxied: ProxiedAccount;
  proxy: ProxyAccount;
};

const flowStarted = createEvent<Input>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $removeProxyStore = createStore<RemoveProxyStore | null>(null).reset(flowFinished);

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $chain = $removeProxyStore.map((store) => store?.chain ?? null);
const $account = $removeProxyStore.map((store) => store?.account ?? null);

const $chainProxies = combine(
  {
    walletAccounts: formModel.$walletAccounts,
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
  },
  ({ walletAccounts, chains, proxies }): Record<ChainId, ProxyAccount[]> => {
    return proxyUtils.getProxyAccountsOnChain(walletAccounts, Object.keys(chains) as ChainId[], proxies);
  },
);

const $initiatorWallet = combine(
  {
    store: $removeProxyStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return null;

    return walletUtils.getWalletById(wallets, store.account.walletId) ?? null;
  },
);

split({
  clock: wentBackFromConfirm,
  source: formModel.$isMultisig,
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
    apis: networkModel.$apis,
  },
  fn: ({ chains, apis }, { proxy, proxied }) => {
    const chain = chains[proxied.chainId];

    return {
      api: apis[proxied.chainId],
      chain,
      account: proxied,
      proxiedAccount: proxied,
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
    activeWallet: walletSelect.$selectedWallet,
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
    api: $removeProxyStore.map((store) => store?.api),
  },
  filter: ({ api }, { proxied }) => nonNullable(proxied) && nonNullable(api),
  fn: ({ api }, { proxied }) => {
    return {
      api: api!,
      accountId: proxied!.accountId,
    };
  },
  target: formModel.getAccountProxiesFx,
});

sample({
  clock: warningModel.formSubmitted,
  source: {
    account: $account,
    chain: $chain,
  },
  filter: ({ account, chain }) => {
    return nonNullable(account) && nonNullable(chain);
  },
  fn: () => Step.INIT,
  target: $step,
});

sample({
  clock: warningModel.formSubmitted,
  source: {
    signatories: formModel.$signatories,
    account: $account,
    chain: $chain,
    removeProxyStore: $removeProxyStore,
  },
  filter: ({ account, chain, removeProxyStore }) => {
    return nonNullable(account) && nonNullable(chain) && nonNullable(removeProxyStore);
  },
  fn: ({ account, chain, removeProxyStore }) => {
    console.log({ account, chain, removeProxyStore });
    return {
      account: account,
      proxiedAccount: account as ProxiedAccount,
      chain: chain!,
      spawner: removeProxyStore!.spawner,
      proxyType: removeProxyStore!.proxyType,
    };
  },
  target: formModel.formInitiated,
});

sample({
  clock: formModel.formSubmitted,
  source: {
    tx: formModel.$tx,
    coreTx: formModel.$coreTx,
    chain: $chain,
    account: $account,
    fee: formModel.$fee,
    multisigDeposit: formModel.$multisigDeposit,
    removeProxyStore: $removeProxyStore,
  },
  filter: ({ tx, chain, account, removeProxyStore }) => {
    return nonNullable(tx) && nonNullable(chain) && nonNullable(account) && nonNullable(removeProxyStore);
  },
  fn: ({ tx, coreTx, chain, account, fee, multisigDeposit, removeProxyStore }, formData) => ({
    event: [
      {
        id: 0,
        initiator: account!,
        signatory: formData.signatory || account!,
        route: [account!],
        chain: chain!,
        tx: tx!,
        coreTx: coreTx!,
        spawner: toAccountId(removeProxyStore!.spawner),
        proxyType: removeProxyStore!.proxyType,
        fee: fee.toString(),
        multisigDeposit: multisigDeposit.toString(),
      } satisfies RemovePureProxiedConfirm,
    ],
    step: Step.CONFIRM,
  }),
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigning,
  source: {
    removeProxyStore: $removeProxyStore,
    wrappedTx: formModel.$tx,
    realAccount: $account,
    signatories: formModel.$signatories,
  },
  filter: ({ removeProxyStore, wrappedTx, realAccount }) => {
    return nonNullable(removeProxyStore) && nonNullable(wrappedTx) && nonNullable(realAccount);
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
    wrappedTx: formModel.$tx,
    coreTx: formModel.$coreTx,
  },
  filter: (proxyData) => {
    return nonNullable(proxyData.removeProxyStore) && nonNullable(proxyData.wrappedTx) && nonNullable(proxyData.coreTx);
  },
  fn: (proxyData, signParams) => ({
    event: {
      ...signParams,
      chain: proxyData.removeProxyStore!.chain,
      account: proxyData.removeProxyStore!.account,
      signatory: proxyData.removeProxyStore!.signatory,
      wrappedTxs: [proxyData.wrappedTx!],
      coreTxs: [proxyData.coreTx!],
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
    chainProxies: $chainProxies,
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
    wallet: formModel.$wallet,
    chainProxies: $chainProxies,
    removeProxyStore: $removeProxyStore,
  },
  filter: ({ step, chainProxies, wallet, removeProxyStore }) => {
    const proxies = Object.values(chainProxies).flat();

    return (
      removePureProxyUtils.isSubmitStep(step) &&
      nonNullable(wallet) &&
      nonNullable(removeProxyStore) &&
      proxies.length === 1
    );
  },
  fn: ({ wallet }) => wallet!.id,
  target: walletModel.events.walletRemoved,
});

sample({
  clock: txSaved,
  source: {
    coreTx: formModel.$coreTx,
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
  clock: flowFinished,
  source: {
    activeWallet: walletSelect.$selectedWallet,
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
  $initiatorWallet,

  flowStarted,
  stepChanged,
  wentBackFromConfirm,
  txSaved,
  flowFinished,
};
