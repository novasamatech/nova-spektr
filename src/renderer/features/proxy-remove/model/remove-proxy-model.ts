import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample, split } from 'effector';
import { createGate } from 'effector-react';
import { spread } from 'patronum';

import { type ChainId, type ProxiedAccount, type ProxyAccount, TransactionType, type Wallet } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  getNativeAsset,
  nonNullable,
  nullable,
  toAccountId,
  toAddress,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathType, Paths } from '@/shared/routes';
import { createComplexTxStore, createMultisigDeposit, createSignatoriesStore } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { accountUtils, walletModel } from '@/entities/wallet';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { balanceSubModel } from '@/features/assets-balances';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SubmitInput, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type RemoveProxyConfirm,
  removeProxyConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm/RemoveProxy';
import { removeProxyUtils } from '../lib/remove-proxy-utils';
import { type RemoveProxyStore, Step } from '../lib/types';

const stepChanged = createEvent<Step>();
const wentBackFromConfirm = createEvent();
const stepChangedToInit = stepChanged.prepend(() => Step.INIT);

type Input = {
  proxied: ProxiedAccount;
  proxy: ProxyAccount;
};

const flowStarted = createEvent<Input>();
const flowFinished = createEvent();

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $removeProxyStore = createStore<RemoveProxyStore | null>(null).reset(flowFinished);

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $chain = $removeProxyStore.map((store) => store?.chain ?? null);

const $wallet = flow.state.map(({ wallet }) => wallet);

const $activeProxiesForAccount = createStore<AccountId[]>([]);

const $proxiedAccount = $removeProxyStore.map((store) => (store ? store.proxiedAccount : null));
const $proxyAccount = $removeProxyStore.map((store) => (store ? store.proxyAccount : null));

const $api = $removeProxyStore.map((store) => store?.api ?? null);

const $isPureProxied = $proxiedAccount.map((proxied) => {
  if (!proxied) return false;

  return accountUtils.isPureProxiedAccount(proxied);
});

const $isPureProxiedNeedToBeKilled = combine(
  {
    isPureProxied: $isPureProxied,
    activeProxies: $activeProxiesForAccount,
  },
  ({ isPureProxied, activeProxies }) => {
    return isPureProxied && activeProxies.length === 1;
  },
);

type FormParams = {
  signatory: AnyAccount | null;
};

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    signatory: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            multisigDeposit: $multisigDeposit,
            balances: balanceModel.$balances,
            signatories: $signatories,
            chain: $chain,
          }),
          fn: (signatory, _f, { balances, chain, fee, multisigDeposit }) => {
            if (!signatory) {
              return { message: 'proxy.addProxy.noSignatoryError' };
            }

            const signatoryBalance = balanceUtils.getBalance(
              balances,
              signatory.accountId,
              chain.chainId,
              getNativeAsset(chain.assets).assetId.toString(),
            );

            const hasEnoughTokens = new BN(multisigDeposit)
              .add(new BN(fee))
              .lte(withdrawableAmountBN(signatoryBalance));

            if (!hasEnoughTokens) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }
          },
        };
      },
    },
  },
  validateOn: ['submit'],
});

const $coreTx = combine(
  {
    signatory: form.fields.signatory.$value,
    proxiedAccount: $proxiedAccount,
    data: $removeProxyStore,
    isPureProxiedNeedToBeKilled: $isPureProxiedNeedToBeKilled,
    chain: $chain,
  },
  ({ signatory, proxiedAccount, data, isPureProxiedNeedToBeKilled, chain }) => {
    if (!signatory || !data || !proxiedAccount || !chain) return null;

    if (isPureProxiedNeedToBeKilled) {
      return {
        chainId: chain.chainId,
        accountId: signatory.accountId,
        type: TransactionType.KILL_PURE_PROXY,
        args: {
          spawner: data!.spawner,
          proxyType: data!.proxyType,
          index: 0,
          height: proxiedAccount.blockNumber,
          extIndex: proxiedAccount.extrinsicIndex,
        },
      };
    }

    return {
      chainId: chain.chainId,
      accountId: signatory.accountId,
      type: TransactionType.REMOVE_PROXY,
      args: {
        delegate: data!.proxyAccount.accountId,
        proxyType: data!.proxyType,
        delay: 0,
      },
    };
  },
);

const $signatories = createSignatoriesStore({
  initiator: $proxiedAccount,
  chain: $chain,
  accounts: accounts.$list,
});

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  chain: $chain,
  transaction: $coreTx,
  accounts: accounts.$list,
  initiator: $proxiedAccount,
  signatory: form.fields.signatory.$value,
});

const $multisigThreshold = $route.map((route) => {
  const multisig = route.find(accountUtils.isMultisigAccount);
  if (!multisig) return null;

  return multisig.threshold;
});

const { $multisigDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
});

const $isMultisig = $multisigDeposit.map((deposit) => deposit.gt(BN_ZERO));

type ProxyParams = {
  api: ApiPromise;
  accountId: AccountId;
};
const getAccountProxiesFx = createEffect(async ({ api, accountId }: ProxyParams) => {
  return await proxyPallet.storage.proxies(api, [accountId]);
});

const $chainProxies = combine(
  {
    chains: networkModel.$chains,
    proxies: proxyModel.$proxies,
    wallet: $wallet,
    accounts: accounts.$list,
  },
  ({ chains, proxies, wallet, accounts }): Record<ChainId, ProxyAccount[]> => {
    if (!wallet) return {};

    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);
    return proxyUtils.getProxyAccountsOnChain(walletAccounts, Object.keys(chains) as ChainId[], proxies);
  },
);

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
    isFeeLoading: $pendingFee,
  },
  ({ isFormValid, isFeeLoading }) => isFormValid && !isFeeLoading,
);

sample({
  clock: $signatories,
  filter: (signatories) => signatories.length < 2,
  fn: (signatories) => signatories.at(0)! ?? null,
  target: form.fields.signatory.change,
});

sample({
  clock: getAccountProxiesFx.done,
  fn: ({ result, params }) => {
    const proxies = result.find((el) => el.account === params.accountId)?.value.proxies;

    if (!proxies) return [];

    return proxies.map((el) => el.delegate);
  },
  target: $activeProxiesForAccount,
});

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
    apis: networkModel.$apis,
  },
  fn: ({ chains, apis }, { proxy, proxied }) => {
    const chain = chains[proxied.chainId || proxy.chainId];

    if (!chain) return null;

    return {
      api: apis[chain.chainId],
      chain,
      proxyAccount: proxy,
      proxiedAccount: proxied,
      spawner: toAddress(proxy.accountId, { prefix: chain.addressPrefix }),
      proxyType: proxy.proxyType,
    } satisfies RemoveProxyStore;
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
    walletDetails: $wallet,
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
  target: getAccountProxiesFx,
});

//todo check whether this works fine if there are erros in form
sample({
  clock: $step,
  filter: (step) => removeProxyUtils.isInitStep(step),
  target: form.submit,
});

const confirmEvent = sample({
  clock: form.submit.doneData,
  source: {
    tx: $tx,
    coreTx: $coreTx,
    chain: $chain,
    initiator: $proxiedAccount,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    removeProxyStore: $removeProxyStore,
    route: $route,
  },
  fn: (source, clock) => {
    return { ...source, ...clock };
  },
}).filterMap(({ tx, coreTx, chain, initiator, fee, multisigDeposit, removeProxyStore, route, signatory }) => {
  if (
    nonNullable(tx) &&
    nonNullable(chain) &&
    nonNullable(initiator) &&
    nonNullable(removeProxyStore) &&
    nonNullable(signatory) &&
    nonNullable(coreTx)
  ) {
    return [
      {
        id: 0,
        initiator: initiator,
        signatory: signatory,
        route,
        chain: chain,
        tx,
        coreTx,
        spawner: toAccountId(removeProxyStore.spawner),
        delegate: toAccountId(removeProxyStore.proxyAccount.accountId),
        proxyType: removeProxyStore.proxyType,
        fee: fee.toString(),
        multisigDeposit: multisigDeposit.toString(),
      } satisfies RemoveProxyConfirm,
    ];
  }
});

sample({
  clock: confirmEvent,
  fn: (event) => ({
    event,
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
    wrappedTx: $tx,
    account: $proxiedAccount,
    signatory: form.fields.signatory.$value,
  },
  filter: ({ removeProxyStore, wrappedTx, account }) => {
    return nonNullable(removeProxyStore) && nonNullable(wrappedTx) && nonNullable(account);
  },
  fn: ({ removeProxyStore, signatory, wrappedTx, account }) => ({
    event: {
      signingPayloads: [
        {
          chain: removeProxyStore!.chain,
          account: account!,
          signatory: signatory!,
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
    wrappedTx: $tx,
    coreTx: $coreTx,
    account: $proxiedAccount,
  },
  filter: (proxyData) => {
    return nonNullable(proxyData.removeProxyStore) && nonNullable(proxyData.wrappedTx) && nonNullable(proxyData.coreTx);
  },
  fn: ({ account, removeProxyStore, wrappedTx, coreTx }, signParams) => ({
    event: {
      ...signParams,
      chain: removeProxyStore!.chain,
      account: account!,
      wrappedTxs: [wrappedTx!],
      coreTxs: [coreTx!],
    } satisfies SubmitInput,
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
    proxied: $proxiedAccount,
    proxy: $proxyAccount,
    chainProxies: $chainProxies,
  },
  filter: ({ step, chain, proxied, proxy }) => {
    return removeProxyUtils.isSubmitStep(step) && nonNullable(chain) && nonNullable(proxied) && nonNullable(proxy);
  },
  fn: ({ chainProxies, proxied, proxy, chain }) => {
    const proxyToRemove = chainProxies[chain!.chainId].find(
      (currentProxy) =>
        proxy!.accountId === currentProxy.accountId &&
        proxy!.proxyType === currentProxy.proxyType &&
        proxy!.proxiedAccountId === proxied!.accountId,
    );

    return proxyToRemove ? [proxyToRemove] : [];
  },
  target: proxyModel.events.proxiesRemoved,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    step: $step,
    wallet: $wallet,
    isPureProxiedNeedToBeKilled: $isPureProxiedNeedToBeKilled,
  },
  filter: ({ step, wallet, isPureProxiedNeedToBeKilled }) => {
    return removeProxyUtils.isSubmitStep(step) && nonNullable(wallet) && isPureProxiedNeedToBeKilled;
  },
  fn: ({ wallet }) => wallet!.id,
  target: walletModel.events.walletRemoved,
});

sample({
  clock: txSaved,
  source: {
    coreTx: $coreTx,
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
    walletDetails: $wallet,
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
  source: $isMultisig,
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
  flow,
  flowStarted,
  flowFinished,

  form,
  $chain,
  $proxiedAccount,
  $signatories,
  $multisigDeposit,
  $fee,
  $isMultisig,
  $canSubmit,
  $isPureProxiedNeedToBeKilled,

  $step,
  $wallet,
  stepChanged,
  wentBackFromConfirm,
  txSaved,
};
