import { createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { spread } from 'patronum';

import { type OngoingReferendum } from '@/shared/core';
import { Step, isStep, nonNullable, nonNullableMap, nullable } from '@/shared/lib/utils';
import { votingService } from '@/entities/governance';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import {
  type AggregatedReferendum,
  lockPeriodsModel,
  locksModel,
  networkSelectorModel,
  votingAggregate,
} from '@/features/governance';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';
import { voteConfirmModel } from '@/features/operations/OperationsConfirm';

import { voteForm } from './voteForm';

const flow = createGate<{
  type: 'vote' | 'revote' | null;
  referendum: AggregatedReferendum<OngoingReferendum> | null;
}>({
  defaultState: {
    type: null,
    referendum: null,
  },
});

// Transaction save

const txSaved = createEvent();

sample({
  clock: txSaved,
  source: {
    initiator: voteForm.form.fields.initiator.$value,
    coreTx: voteForm.$coreTx,
    route: voteForm.$route,
  },
  filter: nonNullableMap,
  fn: ({ initiator, coreTx, route }) => {
    if (!initiator || !coreTx) return [];

    const tx: BasketTransactionDraft = {
      initiatorAccountId: initiator.accountId,
      coreTx,
      route,
      createdAt: Date.now(),
    };

    return [tx];
  },
  target: basketOperations.addTransactions,
});

// Steps

const $step = createStore(Step.INIT);

const setStep = createEvent<Step>();

sample({
  clock: setStep,
  target: $step,
});

sample({
  clock: flow.open,
  fn: () => Step.INIT,
  target: setStep,
});

sample({
  clock: voteForm.formSubmitted,
  fn: () => Step.CONFIRM,
  target: setStep,
});

sample({
  clock: voteConfirmModel.startSigning,
  fn: () => Step.SIGN,
  target: $step,
});

sample({
  clock: voteConfirmModel.submitStarted,
  source: $step,
  filter: (step) => isStep(step, Step.SIGN),
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
  fn: () => Step.INIT,
  target: $step,
});

sample({
  clock: voteConfirmModel.submitFinished,
  fn: () => Step.NONE,
  target: $step,
});

const $voteSuccess = createStore(false).reset(flow.close);

sample({
  clock: voteConfirmModel.submitFinished,
  fn: () => true,
  target: $voteSuccess,
});

sample({
  clock: flow.open,
  filter: ({ referendum }) => nonNullable(referendum),
  fn: ({ type, referendum }) => {
    const voters = referendum!.voting.votes.map((vote) => vote.voter);

    return { type, referendum, voters };
  },
  target: spread({
    type: voteForm.$type,
    referendum: voteForm.setReferendum,
    voters: voteForm.$voters,
  }),
});

sample({
  clock: flow.close,
  target: voteForm.form.reset,
});

sample({
  clock: flow.open,
  source: voteForm.$initiators,
  filter: (initiators) => initiators.length === 1,
  fn: (initiators) => initiators.at(0) ?? null,
  target: voteForm.form.fields.initiator.change,
});

sample({
  clock: flow.open,
  source: voteForm.$signatories,
  filter: (signatories) => signatories.length === 1,
  fn: (signatories) => signatories.at(0) ?? null,
  target: voteForm.form.fields.signatory.change,
});

sample({
  clock: voteForm.form.fields.initiator.$value,
  source: {
    state: flow.state,
    network: networkSelectorModel.$network,
  },
  fn: ({ state, network }, account) => {
    if (nullable(account) || nullable(network) || state.referendum?.voting.votes.length === 0) return null;

    const record = state.referendum?.voting.votes.find(({ voter }) => voter === account.accountId);

    if (!record) return null;

    return record.vote;
  },
  target: voteForm.$existingVote,
});

sample({
  clock: voteForm.$existingVote,
  filter: nonNullable,
  fn: (vote) => {
    if (nullable(vote)) return {};

    return {
      amount: votingService.calculateAccountVoteAmount(vote),
      conviction: votingService.getAccountVoteConviction(vote),
    };
  },
  target: voteForm.form.setForm,
});

sample({
  clock: flow.close,
  target: voteConfirmModel.resetConfirm,
});

sample({
  clock: flow.state,
  fn: ({ referendum }) => referendum?.voting.votes.map((vote) => vote.voter) ?? [],
  target: voteForm.$voters,
});

// Data bindings

sample({
  clock: voteConfirmModel.startSigning,
  source: {
    confirms: voteConfirmModel.$confirmMap,
  },
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
  source: voteConfirmModel.$confirmMap,
  filter: (stores) => nonNullable(stores[0]),
  fn: (stores, signParams) => {
    const store = stores[0]!;
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
  clock: voteConfirmModel.submitFinished,
  target: locksModel.events.subscribeLocks,
});

sample({
  clock: voteConfirmModel.submitFinished,
  source: {
    status: flow.status,
    wallet: walletSelect.$selectedWallet,
  },
  filter: ({ status, wallet }) => status && nonNullable(wallet),
  fn: ({ wallet }) => {
    const accountIds = wallet!.accounts.map((a) => a.accountId);

    return { accounts: accountIds };
  },
  target: votingAggregate.events.requestVoting,
});

export const voteModal = {
  $lockPeriods: lockPeriodsModel.$lockPeriods,
  $lock: voteForm.$lockForAccount,
  $existingVote: voteForm.$existingVote,
  $canSubmit: voteForm.$canSubmit,

  $step,
  $voteSuccess,

  events: {
    txSaved,
    setStep,
  },

  gates: {
    flow,
  },
};
