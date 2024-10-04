import { type ApiPromise } from '@polkadot/api';
import { combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import {
  type Account,
  type AccountVote,
  type Address,
  type Asset,
  type BasketTransaction,
  type Chain,
  type ReferendumId,
  type TrackId,
} from '@shared/core';
import { Step, nonNullable, nullable, toAddress } from '@shared/lib/utils';
import { basketModel } from '@entities/basket';
import { transactionBuilder } from '@entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { lockPeriodsModel, locksModel, votingAggregate } from '@/features/governance';
import { createMultipleTxStore } from '@/features/governance/lib/createMultipleTxStore';
import { type SigningPayload, signModel } from '@features/operations/OperationSign';
import { submitModel } from '@features/operations/OperationSubmit';
import { removeVoteConfirmModel } from '@features/operations/OperationsConfirm';
import { type RemoveVoteConfirm } from '@features/operations/OperationsConfirm/Referendum/RemoveVote/model/confirm-model';

const flow = createGate<{
  votes: {
    voter: Address | null;
    referendum: ReferendumId;
    track: TrackId;
    vote?: AccountVote;
  }[];
  chain: Chain | null;
  asset: Asset | null;
  api: ApiPromise | null;
}>({
  defaultState: {
    api: null,
    votes: [],
    chain: null,
    asset: null,
  },
});

// Account

const selectAccount = createEvent<Account>();

const $account = createStore<Account | null>(null);

const $accounts = combine(walletModel.$activeWallet, flow.state, (wallet, { votes, chain }) => {
  if (nullable(wallet) || nullable(chain)) return [];

  return walletUtils.getAccountsBy([wallet], (a) => {
    if (!accountUtils.isChainAndCryptoMatch(a, chain)) return false;

    return votes.some(({ voter }) => toAddress(a.accountId, { prefix: chain.addressPrefix }) === voter);
  });
});

sample({
  clock: $accounts,
  filter: $accounts.map((x) => x.length < 2),
  fn: (s) => s.at(0) ?? null,
  target: $account,
});

sample({
  clock: selectAccount,
  target: $account,
});

const $initiatorWallet = combine($accounts, walletModel.$wallets, (accounts, wallets) => {
  if (accounts.length === 0) return null;

  return walletUtils.getWalletById(wallets, accounts[0].walletId) ?? null;
});

// Signatory

const selectSignatory = createEvent<Account>();

const $signatory = createStore<Account | null>(null);

const $signatories = combine($accounts, walletModel.$wallets, (accounts, wallets) => {
  if (!accounts[0] || !accountUtils.isMultisigAccount(accounts[0])) {
    return [];
  }

  const a = accounts[0].signatories.map((signatory) =>
    walletUtils.getAccountBy(wallets, (a) => a.accountId === signatory.accountId),
  );

  return a.filter((option) => option !== null);
});

const $votesList = combine($accounts, flow.state, (accounts, { votes, chain }) => {
  return accounts.map((account) => {
    return votes.filter((vote) => vote.voter === toAddress(account.accountId, { prefix: chain?.addressPrefix }));
  });
});

sample({
  clock: $signatories,
  filter: $signatories.map((x) => x.length < 2),
  fn: (s) => s.at(0) ?? null,
  target: $signatory,
});

sample({
  clock: selectSignatory,
  target: $signatory,
});

// Transaction

const $coreTxs = combine(flow.state, $accounts, ({ chain, votes }, accounts) => {
  if (nullable(accounts) || nullable(chain) || nullable(votes)) return [];

  return accounts.map((account) =>
    transactionBuilder.buildRemoveVotes({
      accountId: account!.accountId,
      chain,
      votes: votes.filter((vote) => vote.voter === toAddress(account!.accountId, { prefix: chain.addressPrefix })),
    }),
  );
});

const { $wrappedTxs, $txWrappers } = createMultipleTxStore({
  $api: flow.state.map(({ api }) => api),
  $chain: flow.state.map(({ chain }) => chain),
  $activeWallet: walletModel.$activeWallet.map((wallet) => wallet ?? null),
  $wallets: walletModel.$wallets,
  $signatory,
  $accounts,
  $coreTxs,
});

// Transaction save

const txSaved = createEvent();

sample({
  clock: txSaved,
  source: {
    accounts: $accounts,
    transactions: $wrappedTxs,
    txWrappers: $txWrappers,
  },
  fn: ({ accounts, transactions, txWrappers }) => {
    if (nullable(accounts) || nullable(transactions)) return [];

    // @ts-expect-error TODO fix id field
    return accounts.map<BasketTransaction>((account, index) => {
      return { initiatorWallet: account.walletId, coreTx: transactions[index].coreTx, txWrappers: txWrappers[index] };
    });
  },
  target: basketModel.events.transactionsCreated,
});

// Steps

const $step = createStore(Step.CONFIRM);

const setStep = createEvent<Step>();

sample({
  clock: setStep,
  target: $step,
});

sample({
  clock: flow.open,
  fn: () => Step.CONFIRM,
  target: setStep,
});

sample({
  clock: removeVoteConfirmModel.events.sign,
  fn: () => Step.SIGN,
  target: $step,
});

sample({
  clock: removeVoteConfirmModel.events.submitStarted,
  fn: () => Step.SUBMIT,
  target: $step,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: $step,
});

sample({
  clock: flow.close,
  fn: () => Step.NONE,
  target: $step,
});

// Flow management

sample({
  clock: [flow.open, $accounts, $signatory, $wrappedTxs],
  source: {
    state: flow.state,
    accounts: $accounts,
    signatory: $signatory,
    wrappedTxs: $wrappedTxs,
  },
  fn: ({ accounts, signatory, wrappedTxs, state: { votes, api, asset, chain } }): RemoveVoteConfirm[] => {
    if (
      nullable(votes) ||
      nullable(accounts.length) ||
      nullable(asset) ||
      nullable(chain) ||
      nullable(api) ||
      nullable(wrappedTxs?.length)
    ) {
      return [];
    }

    const confirms = accounts.map<RemoveVoteConfirm>((account, index) => ({
      id: index,
      api,
      chain,
      asset,
      votes: votes.filter((vote) => vote.voter === toAddress(account.accountId, { prefix: chain.addressPrefix })),
      account,
      signatory: signatory ?? undefined,
      description: '',
      wrappedTransactions: wrappedTxs[index],
    }));

    return confirms;
  },
  target: removeVoteConfirmModel.events.fillConfirm,
});

sample({
  clock: removeVoteConfirmModel.events.sign,
  source: { confirms: removeVoteConfirmModel.$confirmMap },
  fn: ({ confirms }): { signingPayloads: SigningPayload[] } => {
    if (!confirms) {
      return { signingPayloads: [] };
    }

    return {
      signingPayloads: Object.values(confirms).map(({ meta, accounts }) => ({
        account: accounts.proxy || accounts.initiator,
        chain: meta.chain,
        transaction: meta.wrappedTransactions.wrappedTx,
        signatory: accounts.signer || undefined,
      })),
    };
  },
  target: signModel.events.formInitiated,
});

sample({
  clock: signModel.output.formSubmitted,
  source: removeVoteConfirmModel.$confirmMap,
  filter: (stores) => nonNullable(stores[0]),
  fn: (stores, signParams) => {
    const store = stores[0];
    const { meta } = store;

    return {
      signatures: signParams.signatures,
      txPayloads: signParams.txPayloads,

      chain: meta.chain,
      account: meta.account,
      signatory: meta.signatory,
      description: meta.description,
      wrappedTxs: [meta.wrappedTransactions.wrappedTx],
      coreTxs: [meta.wrappedTransactions.coreTx],
      multisigTxs: meta.wrappedTransactions.multisigTx ? [meta.wrappedTransactions.multisigTx] : [],
    };
  },
  target: submitModel.events.formInitiated,
});

sample({
  clock: removeVoteConfirmModel.events.submitFinished,
  target: locksModel.events.subscribeLocks,
});

sample({
  clock: removeVoteConfirmModel.events.submitFinished,
  source: {
    accounts: $accounts,
    chain: flow.state.map(({ chain }) => chain),
  },
  fn: ({ accounts, chain }) => {
    const addresses = accounts
      .filter(nonNullable)
      .map((account) => toAddress(account.accountId, { prefix: chain?.addressPrefix }));

    return { addresses };
  },
  target: votingAggregate.events.requestVoting,
});

sample({
  clock: flow.close,
  target: [removeVoteConfirmModel.events.resetConfirm, $signatory.reinit],
});

// Aggregate

export const removeVotesModalAggregate = {
  $initiatorWallet,
  $lockPeriods: lockPeriodsModel.$lockPeriods,

  $step,
  $signatory,
  $signatories,
  $votesList,

  $account,
  $accounts,

  events: {
    txSaved,
    setStep,
    selectSignatory,
    selectAccount,
  },

  gates: {
    flow,
  },
};
