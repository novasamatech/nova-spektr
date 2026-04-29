import { type ApiPromise } from '@polkadot/api';
import { type BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { and, delay, not, or, spread } from 'patronum';

import { proxyService } from '@/shared/api/proxy';
import { type CreateFlexibleMultisigOperationParams, type Wallet, CryptoType, NotificationType } from '@/shared/core';
import { createStoreFromEffect } from '@/shared/effector';
import { Step, assert, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
import {
  buildEditControllerMarkerTx,
  createComplexTxStore,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts, balanceService, multisigOperation } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { isEditFlexibleTransaction, transactionBuilder } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { multisigService } from '@/features/multisig-wallet';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';
import { pathModel } from '@/features/signing-path';
import { type ExecutionMode, type SelectedTarget } from '../types';

import { confirmModel } from './confirm-model';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';

const flow = createGate<{ wallet: Wallet | null; controllerOverride?: AccountId | null }>();

const stepChanged = createEvent<Step>();
const selectSignatory = createEvent<AnyAccount | null>();
const targetSelected = createEvent<SelectedTarget | null>();
const executionModeChanged = createEvent<ExecutionMode>();
const nextFromSelectController = createEvent();
const nextFromSigningPath = createEvent();
const signingPathGoBack = createEvent();
const confirmGoBack = createEvent();

const $step = restore(stepChanged, Step.SELECT_CONTROLLER).reset(flow.open).reset(flow.close);
const $selectedTarget = restore<SelectedTarget | null>(targetSelected, null).reset(flow.open).reset(flow.close);
const $executionMode = restore<ExecutionMode>(executionModeChanged, 'verified').reset(flow.open).reset(flow.close);

const $initiatorWallet = flow.state.map((state) => state.wallet ?? null);

const $walletAccounts = combine($initiatorWallet, accounts.$list, (wallet, accountList) => {
  if (!wallet) return [];
  return accountService.filterAccountsByWallet(accountList, wallet.id);
});

const $flexibleMultisigAccount = $walletAccounts.map((acc) => acc.find(accountUtils.isFlexibleMultisigAccount) ?? null);

const $controllerOverride = flow.state.map((state) => state?.controllerOverride ?? null);

const $currentController = combine(
  {
    override: $controllerOverride,
    flex: $flexibleMultisigAccount,
    accountList: accounts.$list,
  },
  ({ override, flex, accountList }) => {
    if (override) {
      const candidate = accountList.find((a) => a.accountId === override);
      if (candidate && accountUtils.isAnyMultisigAccount(candidate)) {
        return {
          accountId: override,
          signatories: candidate.signatories.map((s) => s.accountId),
          threshold: candidate.threshold,
        };
      }

      return { accountId: override, signatories: null, threshold: null };
    }

    if (flex) {
      return {
        accountId: flex.multisigAccountId,
        signatories: flex.signatories.map((s) => s.accountId),
        threshold: flex.threshold,
      };
    }

    return null;
  },
);

const $currentControllerAccountId = $currentController.map((c) => c?.accountId ?? null);

// The flexible multisig stores the pure proxy as a sister `ProxiedAccount`
// (proxyVariant === PURE) under a separate auto-generated wallet. The graph
// in `accounts-structure` selects whichever account is passed first as the
// focal node, so resolving it here lets the overview center on the proxy.
const $pureProxyAccount = combine($flexibleMultisigAccount, accounts.$list, (flex, accountList) => {
  if (!flex) return null;
  return (
    accountList.find(
      (a) => accountUtils.isPureProxiedAccount(a) && a.accountId === flex.accountId && a.chainId === flex.chainId,
    ) ?? null
  );
});

const $chainId = $flexibleMultisigAccount.map((acc) => acc?.chainId ?? null);
const $chain = combine($chainId, networkModel.$chains, (chainId, chains) =>
  chainId ? (chains[chainId] ?? null) : null,
);

// signatories

const $walletSignatories = combine($flexibleMultisigAccount, accounts.$list, (account, accounts) => {
  if (!account) return null;

  const ownAccounts = accounts.filter((a) =>
    account.signatories.some((s) => s.accountId === a.accountId && (s.id ? s.id === a.walletId : true)),
  );

  return account.signatories.sort((a, b) => {
    const aExists = ownAccounts.some((acc) => acc.accountId === a.accountId);
    const bExists = ownAccounts.some((acc) => acc.accountId === b.accountId);
    return Number(bExists) - Number(aExists);
  });
});

sample({
  clock: flow.open,
  source: {
    walletSignatories: $walletSignatories,
    chain: $chain,
  },
  filter: ({ walletSignatories, chain }) => nonNullable(walletSignatories) && nonNullable(chain),
  fn: ({ walletSignatories, chain }) => {
    return walletSignatories!.map((s, i) => ({
      walletId: s.id?.toString(),
      address: toAddress(s.accountId, { prefix: chain!.addressPrefix }),
      index: i,
    }));
  },
  target: signatoryModel.populateSignatories,
});

sample({
  clock: $initiatorWallet.updates.filter({ fn: nonNullable }),
  target: signatoryModel.getSignatoriesBalance,
});

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: $flexibleMultisigAccount,
  accounts: accounts.$list,
});

const $signatory = restore<AnyAccount | null>(selectSignatory, null).reset(flow.close);

sample({
  clock: pathModel.$path,
  source: accounts.$list,
  filter: (_accountList, path) => path.length > 0 && path[path.length - 1]!.kind === 'signer',
  fn: (accountList, path) => {
    const leafAccountId = path[path.length - 1]!.accountId;

    return accountList.find((a) => a.accountId === leafAccountId) ?? null;
  },
  target: $signatory,
});

const $signatoryBalance = combine(
  { balances: balanceModel.$balanceMap, signatory: $signatory, chain: formModel.$chain, asset: formModel.$asset },
  ({ balances, signatory, chain, asset }) => {
    if (nullable(signatory) || nullable(chain) || nullable(asset)) return null;

    return balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId);
  },
);

// deposits

const { $: $proxiesInfo, $pending: $pendingProxies } = createStoreFromEffect({
  fn: ({ api, accountId }: { api: ApiPromise; accountId: AccountId }) => {
    return proxyService.getProxiesForAccount(api, accountId);
  },
  params: {
    api: formModel.$api,
    accountId: $flexibleMultisigAccount.map((account) => account?.accountId ?? null),
  },
  defaultValue: null,
});

const $existentialDeposit = $signatoryBalance.map((b) => (b ? b.ed : BN_ZERO));

// Net change in proxy slots for this operation:
//   verified → +1 (we add a delegate; the old one stays until a separate cleanup tx)
//   trusted  → 0  (batchAll adds and removes in the same tx)
const $proxyCountDelta = $executionMode.map((mode) => (mode === 'verified' ? 1 : 0));

// Display value: the *total* proxy deposit that will be reserved for the proxied
// account after this operation. Always non-zero whenever there is at least one
// proxy slot in the post-state (proxyDepositBase + proxyDepositFactor × count),
// so the row reads as a real chain-derived figure rather than the zero-delta
// of a net-zero swap.
const $proxyDeposit = combine(
  { api: formModel.$api, proxiesInfo: $proxiesInfo, countDelta: $proxyCountDelta },
  ({ api, proxiesInfo, countDelta }) => {
    if (nullable(proxiesInfo) || nullable(api)) return null;

    return proxyService.getProxyDepositRequired(api, proxiesInfo.accounts.length + countDelta);
  },
);

// Math value: how much *additional* deposit the user must lock now.
// Used by $totalDeposit / balance validation (must reflect this operation's cost only).
const $proxyDepositDelta = combine(
  { api: formModel.$api, proxiesInfo: $proxiesInfo, countDelta: $proxyCountDelta },
  ({ api, proxiesInfo, countDelta }) => {
    if (nullable(proxiesInfo) || nullable(api)) return null;

    return proxyService.getProxyDepositDelta(api, proxiesInfo.deposit, proxiesInfo.accounts.length + countDelta);
  },
);

// Effective threshold + signatories of the *new* controller, derived from $selectedTarget.
// Replaces the old form-model-driven path. For 'modify' we use the inline editor's values;
// for 'existing' we use the candidate's own threshold/signatories.
const $effectiveThreshold = $selectedTarget.map<number | null>((target) => {
  if (nullable(target)) return null;
  return target.kind === 'existing' ? target.candidate.threshold : target.threshold;
});

const $effectiveSignatories = $selectedTarget.map<AccountId[]>((target) => {
  if (nullable(target)) return [];
  return target.kind === 'existing' ? target.candidate.signatories : target.signatories;
});

const $newControllerAccountId = combine(
  {
    target: $selectedTarget,
    chain: $chain,
  },
  ({ target, chain }) => {
    if (nullable(target) || nullable(chain)) return null;
    if (target.kind === 'existing') return target.candidate.accountId;

    const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

    return accountUtils.getMultisigAccountId(target.signatories, target.threshold, cryptoType);
  },
);

const { $multisigDeposit, $pending: $pendingMultisigDeposit } = createMultisigDeposit({
  $threshold: $effectiveThreshold,
  $api: formModel.$api,
});

const $totalDeposit = combine(
  {
    existentialDeposit: $existentialDeposit,
    proxyDepositDelta: $proxyDepositDelta,
    multisigDeposit: $multisigDeposit,
  },
  ({ existentialDeposit, proxyDepositDelta, multisigDeposit }) => {
    if (nullable(proxyDepositDelta)) return null;

    return existentialDeposit.add(proxyDepositDelta).add(multisigDeposit);
  },
);

// form management

// formModel.populateForm seeds $chain (still consumed by formModel.$api / $asset which
// drive several stores in this file). The form-model's signatories/threshold are no
// longer the source of truth for the new controller — that lives in $selectedTarget.
sample({
  clock: flow.open,
  source: $chain,
  filter: (chain) => nonNullable(chain),
  target: formModel.populateForm,
});

// transactions

const $controllerEditTx = combine(
  {
    chain: $chain,
    multisigAccount: $flexibleMultisigAccount,
    signer: $signatory,
    newControllerAccountId: $newControllerAccountId,
    currentControllerAccountId: $currentControllerAccountId,
    executionMode: $executionMode,
  },
  ({ chain, multisigAccount, signer, newControllerAccountId, currentControllerAccountId, executionMode }) => {
    if (
      nullable(multisigAccount) ||
      nullable(signer) ||
      nullable(chain) ||
      nullable(newControllerAccountId) ||
      nullable(currentControllerAccountId)
    ) {
      return null;
    }

    const oldAccountId = currentControllerAccountId;

    if (executionMode === 'verified') {
      // Verified path: addProxy + a marker `system.remark` so this op can be told
      // apart from a plain `proxy.addProxy` later (the trusted path is identifiable
      // by its `removeProxy` half). The marker carries the old controller's accountId
      // for downstream cleanup.
      const addProxyTx = transactionBuilder.buildAddProxy({
        chain,
        accountId: oldAccountId,
        delegateAccountId: newControllerAccountId,
        type: multisigAccount.proxyType,
      });

      const markerTx = buildEditControllerMarkerTx({
        chainId: chain.chainId,
        accountId: oldAccountId,
        oldControllerAccountId: oldAccountId,
      });

      return transactionBuilder.buildBatchAll({
        chain,
        accountId: signer.accountId,
        transactions: [addProxyTx, markerTx],
      });
    }

    // Trusted path: batchAll(addProxy + removeProxy).
    return transactionBuilder.buildProxyReassign({
      chain,
      oldAccountId,
      newAccountId: newControllerAccountId,
      signerAccountId: signer.accountId,
      proxyType: multisigAccount.proxyType,
    });
  },
);

// Drafts use the bare controller-edit batch (addProxy + marker, or addProxy +
// removeProxy) without the multisig.asMulti / proxy.proxy wrapping. The wrap is
// applied at submit time based on whichever signatory picks the draft up, so a
// signer doesn't need to be selected here. We use the current controller's
// accountId as the BatchAll's metadata accountId — it's not part of the encoded
// call data hex (only `args.transactions` is), so any non-null AccountId works.
const $draftTx = combine(
  {
    chain: $chain,
    multisigAccount: $flexibleMultisigAccount,
    newControllerAccountId: $newControllerAccountId,
    currentControllerAccountId: $currentControllerAccountId,
    executionMode: $executionMode,
  },
  ({ chain, multisigAccount, newControllerAccountId, currentControllerAccountId, executionMode }) => {
    if (
      nullable(multisigAccount) ||
      nullable(chain) ||
      nullable(newControllerAccountId) ||
      nullable(currentControllerAccountId)
    ) {
      return null;
    }

    const oldAccountId = currentControllerAccountId;

    if (executionMode === 'verified') {
      const addProxyTx = transactionBuilder.buildAddProxy({
        chain,
        accountId: oldAccountId,
        delegateAccountId: newControllerAccountId,
        type: multisigAccount.proxyType,
      });

      const markerTx = buildEditControllerMarkerTx({
        chainId: chain.chainId,
        accountId: oldAccountId,
        oldControllerAccountId: oldAccountId,
      });

      return transactionBuilder.buildBatchAll({
        chain,
        accountId: oldAccountId,
        transactions: [addProxyTx, markerTx],
      });
    }

    return transactionBuilder.buildProxyReassign({
      chain,
      oldAccountId,
      newAccountId: newControllerAccountId,
      signerAccountId: oldAccountId,
      proxyType: multisigAccount.proxyType,
    });
  },
);

const {
  $tx: $flexibleTx,
  $route,
  $pendingWrapping: $pendingFlexibleTxWrap,
} = createComplexTxStore({
  api: formModel.$api,
  initiator: $flexibleMultisigAccount,
  signatory: $signatory,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $controllerEditTx,
});

// Whether the *new* controller multisig already exists locally (so we can skip the remark).
const $isNewControllerMultisigKnown = combine(
  {
    accounts: accounts.$list,
    newControllerAccountId: $newControllerAccountId,
  },
  ({ accounts, newControllerAccountId }) => {
    if (nullable(newControllerAccountId)) return false;

    return accounts.some(
      (a) => accountUtils.isAnyMultisigAccount(a) && multisigService.getMultisigAccountId(a) === newControllerAccountId,
    );
  },
);

const $coreTx = combine(
  {
    chain: $chain,
    signer: $signatory,
    effectiveSignatories: $effectiveSignatories,
    threshold: $effectiveThreshold,
    isMultisigExists: $isNewControllerMultisigKnown,
    flexibleTx: $flexibleTx,
  },
  ({ chain, threshold, effectiveSignatories, signer, isMultisigExists, flexibleTx }) => {
    if (nullable(signer) || nullable(chain) || nullable(threshold) || nullable(flexibleTx)) {
      return null;
    }

    let transactions;
    if (isMultisigExists) {
      transactions = [flexibleTx];
    } else {
      const remarkTx = transactionBuilder.buildRemark({
        chainId: chain.chainId,
        accountId: signer.accountId,
        threshold,
        signatories: effectiveSignatories,
      });

      transactions = [remarkTx, flexibleTx];
    }

    return transactionBuilder.buildBatchAll({ chain, accountId: signer.accountId, transactions });
  },
);

// transaction with remark executed from the signatory without flex wrap
const {
  $tx,
  $fee,
  $pendingFee,
  $pendingWrapping: $pendingTxWrap,
} = createComplexTxStore({
  api: formModel.$api,
  initiator: $signatory,
  signatory: $signatory,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $coreTx,
});

// validation

const validator = createTxValidator<{ proxyDeposit: BN }>({
  additionalBalanceRules: [
    ({ route, getBalance, asset, proxyDeposit }) => {
      const initiator = accountService.findInitiator(route);
      assert(initiator, 'Initiator not found');

      if (!accountUtils.isFlexibleMultisigAccount(initiator)) {
        throw new Error('Initiator is not a flexible multisig account');
      }

      const balance = getBalance(initiator.accountId, initiator.chainId, asset.assetId);
      assert(balance, 'Balance not found');

      return {
        account: initiator,
        balance: balanceService.tryReserve(balance, proxyDeposit, 'legacy'),
        asset: asset,
        action: 'proxy deposit',
      };
    },
  ],
});

const {
  $errors,
  $valid,
  $pending: $validationPending,
  $validationDone,
} = createTxValidationStore({
  validator,
  params: {
    api: formModel.$api,
    asset: formModel.$asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
    proxyDeposit: $proxyDepositDelta,
  },
});

const $isTheSameMultisig = combine(
  {
    newControllerAccountId: $newControllerAccountId,
    currentControllerAccountId: $currentControllerAccountId,
  },
  ({ currentControllerAccountId, newControllerAccountId }) => {
    if (!newControllerAccountId || !currentControllerAccountId) return false;

    return newControllerAccountId === currentControllerAccountId;
  },
);

const $isEditOperationAlreadyExists = combine(
  {
    operations: multisigOperation.$list,
    flexibleMultisigAccount: $flexibleMultisigAccount,
  },
  ({ flexibleMultisigAccount, operations }) => {
    if (nullable(flexibleMultisigAccount)) return false;

    return operations.some((operation) => {
      return (
        isEditFlexibleTransaction(operation.transaction, flexibleMultisigAccount.accountId) &&
        operation.status === 'pending'
      );
    });
  },
);

const $isLoading = or($pendingFee, $pendingMultisigDeposit, $pendingProxies, $pendingFlexibleTxWrap, $pendingTxWrap);

// Tx is "ready to submit" when the outer wrap has produced a non-null transaction.
// Used to gate Step-2 / Step-3 submission so a click doesn't get silently dropped
// by the formSubmitted filter when $tx is still null.
const $isTxReady = $tx.map(nonNullable);

// "Can proceed from confirm step" — gated on a fully-resolved new controller, no loading,
// no conflict with existing edit operation, and no self-target.
const $canProceedFromForm = and(
  $newControllerAccountId.map((id) => nonNullable(id)),
  $effectiveThreshold.map((t) => nonNullable(t) && t > 0),
  not($isLoading),
  not($isTheSameMultisig),
  not($isEditOperationAlreadyExists),
);

const $canSubmit = and($valid, $canProceedFromForm);

// step transitions

sample({
  clock: nextFromSelectController,
  source: $selectedTarget,
  filter: nonNullable,
  fn: () => Step.SIGNING_PATH,
  target: stepChanged,
});

sample({
  clock: stepChanged,
  source: { flexible: $flexibleMultisigAccount, path: pathModel.$path },
  filter: ({ flexible, path }, step) => step === Step.SIGNING_PATH && nonNullable(flexible) && path.length === 0,
  fn: ({ flexible }) => [{ kind: 'proxied' as const, accountId: flexible!.accountId }],
  target: pathModel.pathSeeded,
});

sample({
  clock: nextFromSigningPath,
  source: pathModel.$isComplete,
  filter: (isComplete) => isComplete,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

sample({
  clock: signingPathGoBack,
  fn: () => Step.SELECT_CONTROLLER,
  target: stepChanged,
});

sample({ clock: [flow.open, flow.close], target: pathModel.pathReset });

const $confirmIntent = createStore(false).reset(flow.open).reset(flow.close);
sample({ clock: nextFromSigningPath, fn: () => true, target: $confirmIntent });

const formSubmitted = sample({
  clock: [$confirmIntent, $tx.updates],
  source: {
    intent: $confirmIntent,
    tx: $tx,
    coreTx: $coreTx,
    route: $route,
    initiator: $flexibleMultisigAccount,
    signatory: $signatory,
    chain: $chain,
  },
}).filterMap(({ intent, chain, tx, coreTx, route, initiator, signatory }) => {
  if (!intent) return undefined;
  if (
    nonNullable(coreTx) &&
    nonNullable(chain) &&
    nonNullable(initiator) &&
    nonNullable(signatory) &&
    nonNullable(tx)
  ) {
    return [{ tx, coreTx, route, signatory, initiator, chain }];
  }
});

sample({ clock: formSubmitted, target: confirmModel.init });
sample({ clock: formSubmitted, fn: () => false, target: $confirmIntent });

// Confirm → back to SIGNING_PATH. $selectedTarget and the path are preserved
// so the user doesn't lose their picks on backtrack.
sample({
  clock: confirmGoBack,
  fn: () => Step.SIGNING_PATH,
  target: stepChanged,
});

sample({
  clock: confirmModel.startSigning,
  source: {
    chain: $chain,
    tx: $tx,
    initiator: $flexibleMultisigAccount,
    signer: $signatory,
  },
  filter: ({ chain, tx, initiator, signer }) =>
    nonNullable(chain) && nonNullable(tx) && nonNullable(initiator) && nonNullable(signer),
  fn: ({ chain, tx, initiator, signer }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: initiator!,
          transaction: tx!,
          signatory: signer,
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
  source: $tx,
  filter: (tx) => nonNullable(tx),
  fn: (_, payload) => ({ event: payload, step: Step.SUBMIT }),
  target: spread({
    event: submitModel.init,
    step: stepChanged,
  }),
});

const viewOperation = createEvent();

sample({
  clock: viewOperation,
  source: $initiatorWallet,
  filter: (initiatorWallet) => nonNullable(initiatorWallet),
  fn: (initiatorWallet) => initiatorWallet!.id,
  target: walletSelect.select,
});

sample({
  clock: viewOperation,
  fn: () => ({ wallet: null }),
  target: flow.close,
});

sample({
  clock: viewOperation,
  fn: () => Paths.OPERATIONS,
  target: navigationModel.events.navigateTo,
});

sample({
  clock: delay(flow.close, 2000),
  fn: () => Step.SELECT_CONTROLLER,
  target: stepChanged,
});

sample({
  clock: flow.close,
  target: [formModel.resetForm, signatoryModel.$signatories.reinit],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    multisigAccount: $flexibleMultisigAccount,
    initiatorWallet: $initiatorWallet,
    effectiveSignatories: $effectiveSignatories,
    threshold: $effectiveThreshold,
    chainId: $chainId,
  },
  filter: ({ multisigAccount, initiatorWallet, threshold, chainId }) =>
    nonNullable(multisigAccount) && nonNullable(initiatorWallet) && nonNullable(threshold) && nonNullable(chainId),
  fn: ({ multisigAccount, initiatorWallet, effectiveSignatories, threshold, chainId }) => {
    const notification: CreateFlexibleMultisigOperationParams = {
      key: `${NotificationType.FLEXIBLE_MULTISIG_EDITED}:${multisigAccount!.accountId}`,
      walletId: initiatorWallet!.id,
      type: NotificationType.FLEXIBLE_MULTISIG_EDITED,
      status: 'info',
      issuer: multisigAccount!.accountId,
      title: 'Flexible multisig wallet edited',
      description: `${threshold}/${effectiveSignatories.length} threshold`,
      chainId: chainId!,
      multisigAccountId: multisigAccount!.accountId,
      accountId: multisigAccount!.accountId,
      accountName: multisigAccount!.name,
      signatories: effectiveSignatories,
      threshold: threshold!,
      batch: {
        title: 'notifications.toast.batch.flexibleMultisigWalletsEdited',
        description: 'notifications.toast.batch.walletsAddedDescription',
      },
    };

    return [notification];
  },
  target: notificationModel.events.notificationsAdded,
});

export const changeSignatoriesModel = {
  $step,
  $signer: $signatory,
  $signatories,
  $initiatorWallet,
  $flexibleMultisigAccount,
  $pureProxyAccount,
  $proxyDeposit,
  $multisigDeposit,
  $totalDeposit,
  $isEditOperationAlreadyExists,
  $isTheSameMultisig,
  $currentControllerAccountId,
  $currentController,
  $chain,
  $canSubmit,
  $canProceedFromForm,
  $route,
  $errors,
  $valid,
  $validationPending,
  $validationDone,
  $fee,
  $isLoading,
  $isTxReady,
  $selectedTarget,
  $executionMode,
  $effectiveThreshold,
  $effectiveSignatories,
  $newControllerAccountId,
  $coreTx,
  $draftTx,
  $api: formModel.$api,
  stepChanged,
  selectSignatory,
  confirmGoBack,
  viewOperation,
  targetSelected,
  executionModeChanged,
  nextFromSelectController,
  nextFromSigningPath,
  signingPathGoBack,
  flow,
};
