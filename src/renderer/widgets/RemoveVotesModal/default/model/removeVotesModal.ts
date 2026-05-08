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
import { createSigningPathModel } from '@/features/signing-path';

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

const $coreTx = combine({ state: flow.state, initiator: $initiator }, ({ state: { chain, votes }, initiator }) => {
  if (nullable(initiator) || nullable(chain) || nullable(votes)) return null;

  const filteredVotes = votes.filter((vote) => vote.voter === initiator.accountId);

  if (filteredVotes.length === 0) return null;

  return transactionBuilder.buildRemoveVotes({
    accountId: initiator.accountId,
    chain,
    votes: filteredVotes,
  });
});

const { recomputeForSigner, $pathRoute } = createSigningPathModel({
  initiator: $initiator,
  chain: networkSelectorModel.$governanceChain,
  resetOn: flow.close,
  resetUserOverrideOn: $initiator.updates,
});

sample({ clock: $selectedSignatory, target: recomputeForSigner });

const { $tx, $route } = createComplexTxStore({
  api: networkSelectorModel.$governanceChainApi,
  initiator: $initiator,
  signatory: $selectedSignatory,
  accounts: accounts.$list,
  chain: networkSelectorModel.$governanceChain,
  transaction: $coreTx,
  routeOverride: $pathRoute,
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
  clock: submitModel.init,
  source: flow.status,
  filter: (open) => open,
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
  filter: ({ tx, initiator, signatory, state: { votes, asset, chain, api } }) => {
    return (
      nonNullable(initiator) &&
      nonNullable(signatory) &&
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
  source: removeVoteConfirmModel.$confirms,
  fn: (confirms) => {
    return {
      signingPayloads: confirms.map<SigningPayload>(({ meta }) => ({
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
  fn: (_, signParams) => signParams,
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
  source: { open: flow.status, accounts: $availableAccounts },
  filter: ({ open }) => open,
  fn: ({ accounts }) => ({
    accounts: accounts.map((a) => a.accountId),
  }),
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
