import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { delay, spread } from 'patronum';

import { type Wallet } from '@/shared/core';
import { Step, nonNullable, nullable, toAccountId, toAddress } from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';

import { confirmModel } from './confirm-model';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';

const flow = createGate<{ wallet: Wallet | null }>();

const stepChanged = createEvent<Step>();

const $step = restore(stepChanged, Step.SIGNATORIES_THRESHOLD).reset(flow.close);

const $selectedInitiator = createStore<AnyAccount | null>(null).reset(flow.close);
const $initiatorWallet = flow.state.map((state) => state.wallet ?? null);

const $walletAccounts = combine($initiatorWallet, accounts.$list, (wallet, accountList) => {
  if (!wallet) return [];
  return accountService.filterAccountsByWallet(accountList, wallet.id);
});

const $flexProxiedAccount = $walletAccounts.map(
  (acc) => acc.find((a) => accountUtils.isFlexibleProxiedAccount(a)) ?? null,
);
const $multisigAccount = $walletAccounts.map(
  (acc) => acc.find((a) => accountUtils.isFlexibleMultisigAccount(a)) ?? null,
);

const $chainId = $flexProxiedAccount.map((acc) => acc?.chainId ?? null);
const $chain = combine($chainId, networkModel.$chains, (chainId, chains) => (chainId ? chains[chainId] : null));

const $walletSignatories = combine($multisigAccount, accounts.$list, (account, accounts) => {
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
  source: $chain,
  filter: (chain) => nonNullable(chain),
  target: formModel.populateForm,
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
  clock: flow.open,
  source: $multisigAccount,
  fn: (acc) => acc?.threshold ?? null,
  target: formModel.thresholdChanged,
});

sample({
  clock: signatoryModel.$signatories,
  source: accounts.$list,
  filter: (_, signatories) => nonNullable(signatories),
  fn: (accounts, signatories) => {
    const signatory = signatories.at(0);
    if (!signatory) return null;

    return (
      accounts.find(
        (a) =>
          toAccountId(signatory.address) === a.accountId &&
          (signatory.walletId ? signatory.walletId === a.walletId.toString() : true),
      ) ?? null
    );
  },
  target: $selectedInitiator,
});

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: $flexProxiedAccount,
  accounts: accounts.$list,
});

// in the current implementation, the first signatory is always the signer
const $signatory = $signatories.map((signatories) => signatories.at(0) ?? null);

sample({
  clock: $initiatorWallet,
  filter: nonNullable,
  fn: (wallet) => [wallet!],
  target: signatoryModel.getSignatoriesBalance,
});

// Transactions
const $reassignTx = combine(
  {
    chain: $chain,
    multisigAccount: $multisigAccount,
    signer: $signatory,
    newMultisigAccountId: formModel.$newMultisigAccountId,
  },
  ({ chain, newMultisigAccountId, multisigAccount, signer }) => {
    if (nullable(multisigAccount) || nullable(signer) || nullable(chain) || nullable(newMultisigAccountId)) {
      return null;
    }

    return transactionBuilder.buildProxyReassign({
      chain,
      oldAccountId: multisigAccount.accountId,
      newAccountId: newMultisigAccountId,
      signerAccountId: signer.accountId,
    });
  },
);

const { $tx: $flexibleTx } = createComplexTxStore({
  api: formModel.$api,
  initiator: $flexProxiedAccount,
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

const { $tx, $route, $fee, $pendingFee } = createComplexTxStore({
  api: formModel.$api,
  initiator: $selectedInitiator,
  signatory: $signatory,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $coreTx,
});

const validator = createTxValidator();
const { $errors } = createTxValidationStore({
  validator,
  params: {
    api: formModel.$api,
    asset: formModel.$asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $isTheSameMultisig = combine(
  {
    newMultisigAccountId: formModel.$newMultisigAccountId,
    multisigAccount: $multisigAccount,
  },
  ({ multisigAccount, newMultisigAccountId }) => {
    if (!newMultisigAccountId || !multisigAccount) return false;

    return newMultisigAccountId === multisigAccount.accountId;
  },
);

const $isLoading = combine(
  {
    multisigDeposit: formModel.$pendingMultisigDeposit,
    isFeeLoading: $pendingFee,
  },
  ({ multisigDeposit, isFeeLoading }) => multisigDeposit || isFeeLoading,
);

const $canSubmit = combine(
  {
    threshold: formModel.$threshold,
    isLoading: $isLoading,
    hasEmptySignatories: signatoryModel.$hasEmptySignatories,
    hasDuplicateSignatories: signatoryModel.$hasDuplicateSignatories,
    isTheSameMultisig: $isTheSameMultisig,
  },
  ({ threshold, isLoading, hasEmptySignatories, hasDuplicateSignatories, isTheSameMultisig }) => {
    return (
      !isLoading &&
      nonNullable(threshold) &&
      threshold > 1 &&
      !hasEmptySignatories &&
      !hasDuplicateSignatories &&
      !isTheSameMultisig
    );
  },
);

// Submit
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
    initiator: $selectedInitiator,
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
    initiator: $selectedInitiator,
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

sample({
  clock: delay(flow.close, 2000),
  fn: () => Step.SIGNATORIES_THRESHOLD,
  target: stepChanged,
});

sample({
  clock: flow.close,
  target: [formModel.resetForm, signatoryModel.$signatories.reinit],
});

export const changeSignatoriesModel = {
  $step,
  $signer: $signatory,
  $initiatorWallet,
  $chain,
  $canSubmit,
  $route,
  $errors,

  $fee,
  $isLoading,

  stepChanged,

  flow,
};
