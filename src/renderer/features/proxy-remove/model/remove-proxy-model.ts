import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample, split } from 'effector';
import { createGate } from 'effector-react';
import { spread } from 'patronum';

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
import { Paths } from '@/shared/routes';
import {
  createComplexTxStore,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { accountSync, multisigOperationService } from '@/domains/network';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { proxyModel, proxyUtils } from '@/entities/proxy';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { balanceSubModel } from '@/features/assets-balances';
import { createDraftModeBinding, wireDraftCloseRedirect } from '@/features/drafts';
import { multisigService } from '@/features/multisig-wallet';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type RemoveProxyConfirm,
  removeProxyConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm/RemoveProxy';
import { removeProxyValidator } from '@/features/operations/OperationsValidation';
import { createSigningPathModel } from '@/features/signing-path';
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

const draftMode = createDraftModeBinding({ formInitiated: flowStarted, chainChanged: flowStarted });

const flow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $removeProxyStore = createStore<RemoveProxyStore | null>(null).reset(flowFinished);

const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

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
            isDraftMode: draftMode.$isDraftMode,
          }),
          fn: (signatory, _f, { balances, chain, fee, multisigDeposit, isDraftMode }) => {
            if (isDraftMode) return;
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

const { $signingPath, signingPathChanged, $signatoryFromPath, recomputeForSigner, $pathRoute } = createSigningPathModel(
  {
    initiator: $proxiedAccount,
    chain: $chain,
    resetOn: flowStarted,
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  chain: $chain,
  transaction: $coreTx,
  accounts: accounts.$list,
  initiator: $proxiedAccount,
  signatory: form.fields.signatory.$value,
  routeOverride: $pathRoute,
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
const $multisigThreshold = $route.map((route) => {
  const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
  if (!multisigAccount) return null;

  return multisigAccount.threshold;
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

const $draftCoreTx = combine(
  {
    proxiedAccount: $proxiedAccount,
    data: $removeProxyStore,
    isPureProxiedNeedToBeKilled: $isPureProxiedNeedToBeKilled,
    chain: $chain,
    path: draftMode.$draftSigningPath,
    isPathComplete: draftMode.$isDraftPathComplete,
  },
  ({ proxiedAccount, data, isPureProxiedNeedToBeKilled, chain, path, isPathComplete }) => {
    if (!data || !proxiedAccount || !chain || !isPathComplete) return null;
    const sourceAccountId = path[0]?.accountId;
    if (!sourceAccountId) return null;

    if (isPureProxiedNeedToBeKilled) {
      assert(proxiedAccount.spawner, 'spawner is required');

      return transactionBuilder.buildKillPureProxy({
        chain,
        accountId: sourceAccountId,
        spawner: proxiedAccount.spawner,
        proxyType: data.proxyType,
        index: 0,
        height: proxiedAccount.entropyBlockNumber,
        extIndex: proxiedAccount.extrinsicIndex,
      });
    }

    return transactionBuilder.buildRemoveProxy({
      chain,
      accountId: sourceAccountId,
      delegate: data.proxyAccount.accountId,
      proxyType: data.proxyType,
      delay: 0,
    });
  },
);

const $draftCallDataHex = combine($draftCoreTx, $api, (tx, api) => transactionService.getCallDataHex(tx, api));

const $draftNetworkStore = combine($chain, (chain) => (chain ? { chain, asset: getNativeAsset(chain.assets) } : null));

const $canSubmit = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    valid: $valid,
    formValid: form.$isValid,
    pendingFee: $pendingFee,
  },
  ({ isDraftMode, valid, formValid, pendingFee }) => {
    if (isDraftMode) return false;
    return valid && formValid && !pendingFee;
  },
);

const $canSaveAsDraft = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    isPathComplete: draftMode.$isDraftPathComplete,
    callData: $draftCallDataHex,
    networkStore: $draftNetworkStore,
  },
  ({ isDraftMode, isPathComplete, callData, networkStore }) => {
    if (!isDraftMode || !isPathComplete || !callData || !networkStore) return false;
    return true;
  },
);

draftMode.connectSave({
  source: 'proxy-remove-draft-mode',
  $callDataHex: $draftCallDataHex,
  $networkStore: $draftNetworkStore,
  $canSave: $canSaveAsDraft,
});

sample({
  clock: [$signatoryFromPath, $signatories, flowStarted],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({ clock: form.fields.signatory.$value, target: recomputeForSigner });

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
    const api = chain ? apis[chain.chainId] : undefined;

    if (!chain || !api) return null;

    return {
      api,
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
    isPureProxiedNeedToBeKilled: $isPureProxiedNeedToBeKilled,
  },
  fn: (source, clock) => {
    return { ...source, ...clock };
  },
}).filterMap(
  ({
    tx,
    coreTx,
    chain,
    initiator,
    fee,
    multisigDeposit,
    removeProxyStore,
    route,
    signatory,
    isPureProxiedNeedToBeKilled,
  }) => {
    if (
      nonNullable(tx) &&
      nonNullable(chain) &&
      nonNullable(initiator) &&
      nonNullable(removeProxyStore) &&
      nonNullable(signatory) &&
      nonNullable(fee) &&
      nonNullable(coreTx)
    ) {
      const base = {
        id: 0,
        initiator,
        signatory,
        route,
        chain,
        tx,
        coreTx,
        proxyType: removeProxyStore.proxyType,
        fee: fee.toString(),
        multisigDeposit: multisigDeposit.toString(),
      };

      const confirm: RemoveProxyConfirm = isPureProxiedNeedToBeKilled
        ? { ...base, spawner: toAccountId(removeProxyStore.spawner) }
        : { ...base, delegate: toAccountId(removeProxyStore.proxyAccount.accountId) };

      return [confirm];
    }
  },
);

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
    const proxyToRemove = chainProxies?.[chain!.chainId]?.find(
      (currentProxy: { accountId: string; proxyType: string; proxiedAccountId: string }) =>
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
  clock: flowFinished,
  target: form.reset,
});

sample({
  clock: submitModel.done,
  source: { isMultisig: $isMultisig, coreTx: $coreTx, wrappedTx: $tx, route: $route },
  filter: ({ isMultisig, route }, results) =>
    isMultisig &&
    submitUtils.isSuccessResult(results[0]!.result) &&
    nonNullable(route.find(accountUtils.isAnyMultisigAccount)),
  fn: ({ coreTx, wrappedTx, route }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;
    const multisigAccount = route.find(accountUtils.isAnyMultisigAccount)!;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx!.chainId,
      callHash: wrappedTx!.args.callHash,
      multisigAccountId: multisigService.getMultisigAccountId(multisigAccount),
      blockCreated: timepoint.height,
      indexCreated: timepoint.index,
    });
  },
  target: $redirectAfterSubmitPath,
});

sample({
  clock: submitModel.done,
  source: $removeProxyStore,
  filter: (removeProxyStore, results) =>
    nonNullable(removeProxyStore) && submitUtils.isSuccessResult(results[0]!.result),
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

wireDraftCloseRedirect({
  $initiatedDraft: draftMode.$initiatedDraft,
  flowFinished,
  redirectTarget: $redirectAfterSubmitPath,
  destination: Paths.OPERATIONS,
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
  $signingPath,
  $multisigDeposit,
  $fee,
  $isMultisig,
  $canSubmit,
  $isPureProxiedNeedToBeKilled,

  $step,
  $wallet,
  $coreTx,
  $api,
  stepChanged,
  wentBackFromConfirm,
  signingPathChanged,
  txSaved,
  $errors,

  $isDraftMode: draftMode.$isDraftMode,
  $isDraftPathComplete: draftMode.$isDraftPathComplete,
  $canSaveAsDraft,
  $initiatedDraft: draftMode.$initiatedDraft,
  $draftSigningPath: draftMode.$draftSigningPath,

  events: {
    toggleDraftMode: draftMode.draftModeToggled,
    saveAsDraftRequested: draftMode.saveAsDraftRequested,
    draftPathCommitted: draftMode.draftPathCommitted,
    draftPathEditStarted: draftMode.draftPathEditStarted,
    draftPathEditEnded: draftMode.draftPathEditEnded,
  },
};
