import { type ApiPromise } from '@polkadot/api';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { uniq } from 'lodash';

import { type AccountVote, type Asset, type Chain, type ReferendumId, type TrackId } from '@/shared/core';
import { Step, getNativeAsset, nonNullable, nonNullableMap, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  createComplexTxStore,
  createInitiatorsStore,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { transactionBuilder } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { lockPeriodsModel, locksModel, networkSelectorModel, votingAggregate } from '@/features/governance';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';
import { removeVoteConfirmModel } from '@/features/operations/OperationsConfirm';
import { type RemoveVoteConfirm } from '@/features/operations/OperationsConfirm/Referendum/RemoveVote/model/confirm-model';
import { removeVoteValidator } from '@/features/operations/OperationsValidation';

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

const selectAccount = createEvent<AnyAccount>();

const $pickedAccount = restore(selectAccount, null).reset(flow.close);

const $initiatorsList = createInitiatorsStore({
  chain: networkSelectorModel.$governanceChain,
  accounts: walletSelect.$selectedAccounts,
});

const $availableAccounts = combine($initiatorsList, flow.state, (selectedAccounts, { votes, chain }) => {
  if (nullable(votes.length) || nullable(chain)) return [];

  const accounts = uniq(votes.map((vote) => vote.voter).filter(nonNullable));

  return selectedAccounts.filter(
    (account) => accounts.includes(account.accountId) && accountService.isAccountAvailableOnChain(account, chain),
  );
});

// initiators

const $initiators = combine($availableAccounts, $pickedAccount, (availableAccounts, pickedAccount) => {
  if (nonNullable(pickedAccount)) return [pickedAccount];

  return availableAccounts;
});

const $initiatorWallet = combine($initiators, walletModel.$wallets, (accounts, wallets) => {
  const account = accounts.at(0);
  if (nullable(account)) return null;

  return walletUtils.getWalletById(wallets, account.walletId) ?? null;
});

const $votesList = combine($initiators, flow.state, (initiators, { votes }) => {
  return initiators.map((account) => {
    return votes.filter((vote) => vote.voter === account.accountId);
  });
});

const $initiator = $initiators.map((accounts) => accounts.at(0) ?? null);

// Signatory

const selectSignatory = createEvent<AnyAccount>();

const $selectedSignatory = restore(selectSignatory, null).reset(flow.close);

const $signatories = createSignatoriesStore({
  chain: networkSelectorModel.$governanceChain,
  initiator: $initiator,
  accounts: accounts.$list,
});

sample({
  clock: $signatories,
  filter: $signatories.map((x) => x.length < 2),
  fn: (s) => s.at(0) ?? null,
  target: $selectedSignatory,
});

// Transaction

const $coreTx = combine(flow.state, $selectedSignatory, ({ chain, votes }, account) => {
  if (nullable(account) || nullable(chain) || nullable(votes)) return null;

  return transactionBuilder.buildRemoveVotes({
    accountId: account!.accountId,
    chain,
    votes: votes.filter((vote) => vote.voter === account.accountId),
  });
});

const { $tx, $route } = createComplexTxStore({
  api: networkSelectorModel.$governanceChainApi,
  initiator: $initiator,
  signatory: $selectedSignatory,
  accounts: accounts.$list,
  chain: networkSelectorModel.$governanceChain,
  transaction: $coreTx,
});

// Transaction validation
const $asset = networkSelectorModel.$governanceChain.map((chain) => (chain ? getNativeAsset(chain.assets) : null));
const { $errors, $valid } = createTxValidationStore({
  validator: removeVoteValidator,
  params: {
    api: networkSelectorModel.$governanceChainApi,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});
// Transaction save

const txSaved = createEvent();

sample({
  clock: txSaved,
  source: {
    coreTx: $coreTx,
    route: $route,
  },
  filter: nonNullableMap,
  fn: ({ coreTx, route }) => {
    if (nullable(coreTx)) return [];

    const tx: BasketTransactionDraft = {
      initiatorAccountId: coreTx.accountId,
      coreTx,
      route,
      createdAt: Date.now(),
    };

    return [tx];
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
  clock: removeVoteConfirmModel.submitStarted,
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
  clock: [flow.open, $initiator, $selectedSignatory, $tx],
  source: {
    state: flow.state,
    initiator: $initiator,
    signatory: $selectedSignatory,
    route: $route,
    tx: $tx,
    coreTx: $coreTx,
  },
  filter: ({ tx, initiator, state: { votes, asset, chain, api } }) => {
    return (
      nonNullable(initiator) &&
      nonNullable(tx) &&
      nonNullable(votes) &&
      nonNullable(asset) &&
      nonNullable(chain) &&
      nonNullable(api)
    );
  },
  fn: ({ tx, coreTx, route, initiator, signatory, state: { votes, asset, chain, api } }): RemoveVoteConfirm => {
    return {
      api: api!,
      asset: asset!,
      chain: chain!,
      initiator: initiator!,
      votes: votes.filter((vote) => vote.voter === initiator!.accountId),
      signatory: signatory!,
      route,
      tx: tx!,
      coreTx: coreTx!,
    };
  },
  target: removeVoteConfirmModel.replaceWithConfirm,
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
      account: meta.initiator,
      signatory: meta.signatory,
      wrappedTxs: [meta.tx],
      coreTxs: [meta.coreTx],
    };
  },
  target: submitModel.events.formInitiated,
});

sample({
  clock: removeVoteConfirmModel.submitFinished,
  target: locksModel.events.subscribeLocks,
});

sample({
  clock: removeVoteConfirmModel.submitFinished,
  source: $availableAccounts,
  fn: (accounts) => {
    const accountIds = accounts.filter(nonNullable).map((a) => a.accountId);

    return { accounts: accountIds };
  },
  target: votingAggregate.events.requestVoting,
});

sample({
  clock: flow.close,
  target: [removeVoteConfirmModel.resetConfirm, $selectedSignatory.reinit],
});

export const removeVotesModel = {
  $initiatorWallet,
  $lockPeriods: lockPeriodsModel.$lockPeriods,

  $availableAccounts,
  $pickedAccount,

  $step,
  $signatory: $selectedSignatory,
  $signatories,
  $votesList,

  events: {
    txSaved,
    setStep,
    selectAccount,
    selectSignatory,
  },

  gates: {
    flow,
  },
  $errors,
  $valid,
};
