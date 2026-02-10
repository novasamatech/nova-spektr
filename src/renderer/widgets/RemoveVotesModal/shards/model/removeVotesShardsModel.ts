import { type ApiPromise } from '@polkadot/api';
import { combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { uniq } from 'lodash';

import { type AccountVote, type Asset, type Chain, type ReferendumId, type TrackId } from '@/shared/core';
import { Step, nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { transactionBuilder } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { locksModel, votingAggregate } from '@/features/governance';
import { createMultipleTxStore } from '@/features/governance/lib/createMultipleTxStore';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';
import { type RemoveVoteConfirm, removeVoteConfirmModel } from '@/features/operations/OperationsConfirm';

const flow = createGate<{
  votes: {
    voter: AccountId;
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

const $availableAccounts = combine(walletSelect.$selectedWallet, flow.state, (wallet, { votes, chain }) => {
  if (nullable(wallet) || nullable(votes.length) || nullable(chain)) return [];

  const accounts = uniq(votes.map((vote) => vote.voter).filter(nonNullable));

  return accounts.map((accountId) => {
    return walletUtils.getAccountBy([wallet], (a) => a.accountId === accountId)!;
  });
});

const $initiatorWallet = combine($availableAccounts, walletModel.$wallets, (accounts, wallets) => {
  const account = accounts.at(0);
  if (nullable(account)) return null;

  return walletUtils.getWalletById(wallets, account.walletId) ?? null;
});

const $votesList = combine($availableAccounts, flow.state, (accounts, { votes }) => {
  return accounts.map((account) => {
    return votes.filter((vote) => vote.voter === account.accountId);
  });
});

// Transaction

const $coreTxs = combine(flow.state, $availableAccounts, ({ chain, votes }, accounts) => {
  if (nullable(accounts) || nullable(chain) || nullable(votes)) return [];

  return accounts.map((account) =>
    transactionBuilder.buildRemoveVotes({
      accountId: account!.accountId,
      chain,
      votes: votes.filter((vote) => vote.voter === account.accountId),
    }),
  );
});

const { $wrappedTxs } = createMultipleTxStore({
  $api: flow.state.map(({ api }) => api),
  $chain: flow.state.map(({ chain }) => chain),
  $activeWallet: walletSelect.$selectedWallet.map((wallet) => wallet ?? null),
  $wallets: walletModel.$wallets,
  $accounts: $availableAccounts,
  $coreTxs,
});

// Transaction save

const txSaved = createEvent();

sample({
  clock: txSaved,
  source: $coreTxs,
  fn: (transactions) => {
    return transactions.map((coreTx) => ({
      initiatorAccountId: coreTx.accountId,
      coreTx,
      route: [],
      createdAt: Date.now(),
    }));
  },
  target: basketOperations.addTransactions,
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
  clock: removeVoteConfirmModel.startSigning,
  fn: () => Step.SIGN,
  target: $step,
});

sample({
  clock: submitModel.init,
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
  clock: [flow.open, $availableAccounts, $wrappedTxs],
  source: {
    state: flow.state,
    accounts: $availableAccounts,
    wrappedTxs: $wrappedTxs,
  },
  fn: ({ accounts, wrappedTxs, state: { votes, api, asset, chain } }): RemoveVoteConfirm[] => {
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

    return accounts.map<RemoveVoteConfirm>((account, index) => {
      const wrappedTx = wrappedTxs[index]!;

      return {
        id: index,
        api,
        asset,
        chain,
        initiator: account,
        votes: votes.filter((vote) => vote.voter === account.accountId),
        signatory: account,
        route: [account],
        tx: wrappedTx.wrappedTx,
        coreTx: wrappedTx.coreTx!,
      };
    });
  },
  target: removeVoteConfirmModel.init,
});

sample({
  clock: removeVoteConfirmModel.startSigning,
  source: { confirms: removeVoteConfirmModel.$confirmMap },
  fn: ({ confirms }): { signingPayloads: SigningPayload[] } => {
    if (!confirms) {
      return { signingPayloads: [] };
    }

    return {
      signingPayloads: Object.values(confirms).map(({ meta }) => ({
        account: meta.initiator,
        chain: meta.chain,
        transaction: meta.tx,
        signatory: meta.signatory,
      })),
    };
  },
  target: signModel.events.formInitiated,
});

sample({
  clock: signModel.signed,
  source: flow.status,
  filter: (open) => open,
  fn: (_, signed) => signed,
  target: submitModel.init,
});

sample({
  clock: submitModel.done,
  source: flow.status,
  filter: (open) => open,
  target: locksModel.events.subscribeLocks,
});

sample({
  clock: submitModel.done,
  source: $availableAccounts,
  fn: (accounts) => {
    const accountIds = accounts.filter(nonNullable).map((a) => a.accountId);

    return { accounts: accountIds };
  },
  target: votingAggregate.events.requestVoting,
});

sample({
  clock: flow.close,
  target: [removeVoteConfirmModel.resetConfirm],
});

// Aggregate

export const removeVotesShardsModel = {
  $initiatorWallet,
  $votesList,
  $step,

  events: {
    txSaved,
    setStep,
  },

  gates: {
    flow,
  },
};
