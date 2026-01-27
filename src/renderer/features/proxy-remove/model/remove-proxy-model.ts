import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample, split } from 'effector';
import { createGate } from 'effector-react';
import { and, not, spread } from 'patronum';

import { type ChainId, type ProxiedAccount, type ProxyAccount, type Wallet } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  assert,
  getNativeAsset,
  keys,
  nonNullable,
  nullable,
  toAccountId,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { proxyPallet } from '@/shared/pallet/proxy';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathType, Paths } from '@/shared/routes';
import {
  createComplexTxStore,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { accountSync } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { balanceSubModel } from '@/features/assets-balances';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type RemoveProxyConfirm,
  removeProxyConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm/RemoveProxy';
import { removeProxyValidator } from '@/features/operations/OperationsValidation';
import { removeProxyUtils } from '../lib/remove-proxy-utils';
import { type RemoveProxyStore, Step } from '../lib/types';

const stepChanged = createEvent<Step>();
const wentBackFromConfirm = createEvent();
const stepChangedToInit = stepChanged.prepend(() => Step.INIT);

type Input = {
  proxied: ProxiedAccount;
  proxy: Omit<ProxyAccount, 'id' | 'delay'>;
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
            balances: balanceModel.$balanceMap,
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
              getNativeAsset(chain.assets).assetId,
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
      assert(proxiedAccount.spawner, 'spawner is required');

      return transactionBuilder.buildKillPureProxy({
        chain,
        accountId: signatory.accountId,
        spawner: proxiedAccount.spawner,
        proxyType: data.proxyType,
        index: 0,
        height: proxiedAccount.entropyBlockNumber,
        extIndex: proxiedAccount.extrinsicIndex,
      });
    }

    return transactionBuilder.buildRemoveProxy({
      chain,
      accountId: signatory.accountId,
      delegate: data.proxyAccount.accountId,
      proxyType: data.proxyType,
      delay: 0,
    });
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

// Transaction validation
const $asset = $chain.map((chain) => (chain ? getNativeAsset(chain.assets) : null));
const { $errors, $valid } = createTxValidationStore({
  validator: removeProxyValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});
const $multisigThreshold = combine($route, accounts.$list, (route, accountsList) => {
  const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
  if (!multisigAccount) return null;

  return accountUtils.getMultisigThreshold(multisigAccount, accountsList);
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
    return proxyUtils.getProxyAccountsOnChain(walletAccounts, keys(chains), proxies);
  },
);

const $canSubmit = and($valid, form.$isValid, not($pendingFee));

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
  source: combine({
    isMultisig: $isMultisig,
    signatories: $signatories,
  }),
  match: {
    multisigWallet: ({ isMultisig, signatories }) => isMultisig && signatories.length !== 1,
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
    const chain = chains[proxy.chainId];

    if (!chain) return null;

    return {
      api: apis[chain.chainId],
      chain,
      proxyAccount: proxy,
      proxiedAccount: proxied,
      spawner: proxied.spawner!,
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
  clock: $wallet,
  filter: nonNullable,
  target: balanceSubModel.fetchWallet,
});

sample({
  clock: flowStarted,
  source: {
    api: $removeProxyStore.map((store) => store?.api ?? null),
  },
  filter: ({ api }, { proxied }) => {
    return nonNullable(proxied) && nonNullable(api);
  },
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
  source: {
    signatories: $signatories,
    isMultisig: $isMultisig,
  },
  filter: ({ signatories }, step) => removeProxyUtils.isInitStep(step) && signatories.length === 1,
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
    nonNullable(fee) &&
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
        spawner: removeProxyStore.spawner ? toAccountId(removeProxyStore.spawner) : undefined,
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
  clock: signModel.signed,
  source: $step,
  filter: (step) => step !== Step.NONE,
  fn: (_, signatureResult) => ({
    event: signatureResult,
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: submitModel.done,
  source: {
    step: $step,
    chain: $chain,
    proxied: $proxiedAccount,
    proxy: $proxyAccount,
    chainProxies: $chainProxies,
  },
  filter: ({ step, chain, proxied, proxy, chainProxies }) => {
    return (
      removeProxyUtils.isSubmitStep(step) &&
      nonNullable(chain) &&
      nonNullable(proxied) &&
      nonNullable(proxy) &&
      nonNullable(chainProxies)
    );
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
  clock: submitModel.done,
  source: {
    step: $step,
    wallet: $wallet,
    isPureProxiedNeedToBeKilled: $isPureProxiedNeedToBeKilled,
  },
  filter: ({ step, wallet, isPureProxiedNeedToBeKilled }) => {
    return removeProxyUtils.isSubmitStep(step) && nonNullable(wallet) && isPureProxiedNeedToBeKilled;
  },
  fn: ({ wallet }) => wallet!.id,
  target: walletModel.events.removeWallet,
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
  fn: () => Step.NONE,
  target: stepChanged,
});

sample({
  clock: submitModel.done,
  source: $isMultisig,
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0].result),
  fn: () => Paths.OPERATIONS,
  target: $redirectAfterSubmitPath,
});

sample({
  clock: submitModel.done,
  source: $removeProxyStore,
  filter: (removeProxyStore, results) =>
    nonNullable(removeProxyStore) && submitUtils.isSuccessResult(results[0].result),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  target: accountSync.syncAccounts,
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
  $proxyAccount,
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
  $errors,
};
