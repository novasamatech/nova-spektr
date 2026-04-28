import { type ApiPromise } from '@polkadot/api';
import { type BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { and, delay, not, or, spread } from 'patronum';

import { proxyService } from '@/shared/api/proxy';
import { type CreateFlexibleMultisigOperationParams, type Wallet, CryptoType, NotificationType } from '@/shared/core';
import { createStoreFromEffect } from '@/shared/effector';
import { Step, assert, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
import {
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
import { type PathNode } from '../lib/path';
import { type ExecutionMode, type SelectedTarget } from '../types';

import { confirmModel } from './confirm-model';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';

const flow = createGate<{ wallet: Wallet | null }>();

const stepChanged = createEvent<Step>();
const selectSignatory = createEvent<AnyAccount | null>();
const targetSelected = createEvent<SelectedTarget>();
const executionModeChanged = createEvent<ExecutionMode>();
const nextFromSelectController = createEvent();
const signingPathConfirmed = createEvent<PathNode[]>();
const confirmGoBack = createEvent();

const $step = restore(stepChanged, Step.SELECT_CONTROLLER).reset(flow.close);
const $selectedTarget = restore<SelectedTarget | null>(targetSelected, null).reset(flow.open).reset(flow.close);
const $executionMode = restore<ExecutionMode>(executionModeChanged, 'verified').reset(flow.open).reset(flow.close);
const $signingPath = restore<PathNode[]>(signingPathConfirmed, []).reset(flow.open).reset(flow.close);

const $initiatorWallet = flow.state.map((state) => state.wallet ?? null);

const $walletAccounts = combine($initiatorWallet, accounts.$list, (wallet, accountList) => {
  if (!wallet) return [];
  return accountService.filterAccountsByWallet(accountList, wallet.id);
});

const $flexibleMultisigAccount = $walletAccounts.map((acc) => acc.find(accountUtils.isFlexibleMultisigAccount) ?? null);

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
  clock: $signatories,
  filter: (signatories) => signatories.length === 1,
  fn: (signatories) => signatories.at(0) ?? null,
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

const { $: $proxiesInfo } = createStoreFromEffect({
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

const $proxyDeposit = combine(formModel.$api, $proxiesInfo, (api, proxiesInfo) => {
  if (nullable(proxiesInfo) || nullable(api)) return null;

  return proxyService.getProxyDepositDelta(api, proxiesInfo.deposit, proxiesInfo.accounts.length + 1);
});

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
    proxyDeposit: $proxyDeposit,
    multisigDeposit: $multisigDeposit,
  },
  ({ existentialDeposit, proxyDeposit, multisigDeposit }) => {
    if (nullable(proxyDeposit)) return null;

    return existentialDeposit.add(proxyDeposit).add(multisigDeposit);
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
    executionMode: $executionMode,
  },
  ({ chain, multisigAccount, signer, newControllerAccountId, executionMode }) => {
    if (nullable(multisigAccount) || nullable(signer) || nullable(chain) || nullable(newControllerAccountId)) {
      return null;
    }

    const oldAccountId = multisigService.getMultisigAccountId(multisigAccount);

    if (executionMode === 'verified') {
      // Verified path: only addProxy. The user removes the old delegate themselves
      // after verifying the new controller.
      return transactionBuilder.buildAddProxy({
        chain,
        accountId: oldAccountId,
        delegateAccountId: newControllerAccountId,
        type: multisigAccount.proxyType,
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

const { $tx: $flexibleTx, $route } = createComplexTxStore({
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
const { $tx, $fee, $pendingFee } = createComplexTxStore({
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

const { $errors, $valid } = createTxValidationStore({
  validator,
  params: {
    api: formModel.$api,
    asset: formModel.$asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
    proxyDeposit: $proxyDeposit,
  },
});

const $isTheSameMultisig = combine(
  {
    newControllerAccountId: $newControllerAccountId,
    multisigAccount: $flexibleMultisigAccount,
  },
  ({ multisigAccount, newControllerAccountId }) => {
    if (!newControllerAccountId || !multisigAccount) return false;

    return newControllerAccountId === multisigService.getMultisigAccountId(multisigAccount);
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

const $isLoading = or($pendingFee, $pendingMultisigDeposit);

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

// Step 1 → Step 2: requires a non-null $selectedTarget. The UI keeps the Next button
// disabled until that's true; this filter is a defence-in-depth guard.
sample({
  clock: nextFromSelectController,
  source: $selectedTarget,
  filter: nonNullable,
  fn: () => Step.SIGNING_PATH,
  target: stepChanged,
});

// Step 2 → Step 3 (confirm). When the path picker confirms, we kick off confirmModel.init
// with the resolved tx/route plus advance the step.
const formSubmitted = sample({
  clock: signingPathConfirmed,
  source: {
    tx: $tx,
    coreTx: $coreTx,
    route: $route,
    initiator: $flexibleMultisigAccount,
    signatory: $signatory,
    chain: $chain,
  },
}).filterMap(({ chain, tx, coreTx, route, initiator, signatory }) => {
  if (
    nonNullable(coreTx) &&
    nonNullable(chain) &&
    nonNullable(initiator) &&
    nonNullable(signatory) &&
    nonNullable(tx)
  ) {
    return [
      {
        tx,
        coreTx,
        route,
        signatory,
        initiator,
        chain,
      },
    ];
  }
});

sample({
  clock: formSubmitted,
  fn: (event) => {
    return {
      event,
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

// Confirm → back to Step 2 (the path picker). $signingPath is preserved so the user
// doesn't lose their picked path on backtrack.
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
  $proxyDeposit,
  $multisigDeposit,
  $totalDeposit,
  $isEditOperationAlreadyExists,
  $chain,
  $canSubmit,
  $canProceedFromForm,
  $route,
  $errors,
  $fee,
  $isLoading,
  $selectedTarget,
  $executionMode,
  $signingPath,
  $effectiveThreshold,
  $effectiveSignatories,
  $newControllerAccountId,
  stepChanged,
  selectSignatory,
  confirmGoBack,
  viewOperation,
  targetSelected,
  executionModeChanged,
  nextFromSelectController,
  signingPathConfirmed,
  flow,
};
