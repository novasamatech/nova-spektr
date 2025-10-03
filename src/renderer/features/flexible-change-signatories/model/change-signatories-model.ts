import { type ApiPromise } from '@polkadot/api';
import { type BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { and, delay, not, or, spread } from 'patronum';

import { proxyService } from '@/shared/api/proxy';
import { type FlexibleMultisigOperationNotification, type NoID, NotificationType, type Wallet } from '@/shared/core';
import { createStoreFromEffect } from '@/shared/effector';
import { Step, assert, nonNullable, nullable, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
import {
  createComplexTxStore,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
} from '@/shared/transactions';
import { accountService, accounts, balanceService, multisigOperation } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { isEditFlexibleTransaction, transactionBuilder } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { multisigService } from '@/features/multisig-wallet';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';

import { confirmModel } from './confirm-model';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';

const flow = createGate<{ wallet: Wallet | null }>();

const stepChanged = createEvent<Step>();

const $step = restore(stepChanged, Step.SIGNATORIES_THRESHOLD).reset(flow.close);

const $initiatorWallet = flow.state.map((state) => state.wallet ?? null);

const $walletAccounts = combine($initiatorWallet, accounts.$list, (wallet, accountList) => {
  if (!wallet) return [];
  return accountService.filterAccountsByWallet(accountList, wallet.id);
});

const $flexibleMultisigAccount = $walletAccounts.map((acc) => acc.find(accountUtils.isFlexibleMultisigAccount) ?? null);

const $chainId = $flexibleMultisigAccount.map((acc) => acc?.chainId ?? null);
const $chain = combine($chainId, networkModel.$chains, (chainId, chains) => (chainId ? chains[chainId] : null));

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

// in the current implementation, the first signatory is always the signer
const $signatory = $signatories.map((signatories) => signatories.at(0) ?? null);

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

const { $multisigDeposit, $pending: $pendingMultisigDeposit } = createMultisigDeposit({
  $threshold: formModel.$threshold,
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

sample({
  clock: flow.open,
  source: $chain,
  filter: (chain) => nonNullable(chain),
  target: formModel.populateForm,
});

sample({
  clock: flow.open,
  source: $flexibleMultisigAccount,
  fn: (acc) => acc?.threshold ?? null,
  target: formModel.thresholdChanged,
});

// transactions

const $reassignTx = combine(
  {
    chain: $chain,
    multisigAccount: $flexibleMultisigAccount,
    signer: $signatory,
    newMultisigAccountId: formModel.$newMultisigAccountId,
  },
  ({ chain, newMultisigAccountId, multisigAccount, signer }) => {
    if (nullable(multisigAccount) || nullable(signer) || nullable(chain) || nullable(newMultisigAccountId)) {
      return null;
    }

    return transactionBuilder.buildProxyReassign({
      chain,
      oldAccountId: multisigService.getMultisigAccountId(multisigAccount),
      newAccountId: newMultisigAccountId,
      signerAccountId: signer.accountId,
    });
  },
);

const { $tx: $flexibleTx, $route } = createComplexTxStore({
  api: formModel.$api,
  initiator: $flexibleMultisigAccount,
  signatory: $signatory,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $reassignTx,
});

const $coreTx = combine(
  {
    chain: $chain,
    signer: $signatory,
    signatories: signatoryModel.$signatories,
    threshold: formModel.$threshold,
    isMultisigExists: formModel.$isMultisigExists,
    flexibleTx: $flexibleTx,
  },
  ({ chain, threshold, signatories, signer, isMultisigExists, flexibleTx }) => {
    if (nullable(signer) || nullable(chain) || nullable(threshold) || nullable(flexibleTx)) {
      return null;
    }

    const signatoriesWrapped = signatories.filter((a) => a.address !== '').map((s) => toAccountId(s.address));

    let transactions;
    if (isMultisigExists) {
      transactions = [flexibleTx];
    } else {
      const remarkTx = transactionBuilder.buildRemark({
        chainId: chain.chainId,
        accountId: signer.accountId,
        threshold,
        signatories: signatoriesWrapped,
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
    newMultisigAccountId: formModel.$newMultisigAccountId,
    multisigAccount: $flexibleMultisigAccount,
  },
  ({ multisigAccount, newMultisigAccountId }) => {
    if (!newMultisigAccountId || !multisigAccount) return false;

    return newMultisigAccountId === multisigService.getMultisigAccountId(multisigAccount);
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

const $canSubmit = and(
  $valid,
  formModel.$threshold.map((threshold) => nonNullable(threshold) && threshold > 0),
  not($isLoading),
  not($isTheSameMultisig),
  not($isEditOperationAlreadyExists),
  not(formModel.$isMultisigExists),
  not(signatoryModel.$hasEmptySignatories),
  not(signatoryModel.$hasDuplicateSignatories),
);

// submit

sample({
  clock: formModel.formSubmit,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

const formSubmitted = sample({
  clock: formModel.formSubmit,
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
  fn: () => Step.SIGNATORIES_THRESHOLD,
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
    signatories: signatoryModel.$signatories,
    threshold: formModel.$threshold,
  },
  filter: ({ multisigAccount, initiatorWallet, threshold }) => {
    return nonNullable(multisigAccount) && nonNullable(initiatorWallet) && nonNullable(threshold);
  },
  fn: ({ multisigAccount, initiatorWallet, signatories, threshold }) => {
    const notification: NoID<FlexibleMultisigOperationNotification> = {
      read: false,
      walletId: initiatorWallet!.id,
      type: NotificationType.FLEXIBLE_MULTISIG_EDITED,
      dateCreated: Date.now(),
      multisigAccountId: multisigAccount!.accountId,
      accountId: multisigAccount!.accountId,
      accountName: multisigAccount!.name,
      signatories: signatories.map((signatory) => toAccountId(signatory.address)),
      threshold: threshold!,
    };

    return [notification];
  },
  target: notificationModel.events.notificationsAdded,
});

export const changeSignatoriesModel = {
  $step,
  $signer: $signatory,
  $initiatorWallet,
  $proxyDeposit,
  $multisigDeposit,
  $totalDeposit,
  $isEditOperationAlreadyExists,
  $chain,
  $canSubmit,
  $route,
  $errors,
  $fee,
  $isLoading,
  stepChanged,
  viewOperation,
  flow,
};
