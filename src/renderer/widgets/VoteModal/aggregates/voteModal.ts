import { combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { spread } from 'patronum';

import { type OngoingReferendum } from '@/shared/core';
import { Step, isStep, nonNullable, nonNullableMap, nullable, toAddress } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { votingService } from '@/entities/governance';
import { walletModel } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import {
  type AggregatedReferendum,
  delegationAggregate,
  lockPeriodsModel,
  locksModel,
  networkSelectorModel,
  votingAggregate,
} from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { voteConfirmModel } from '@/features/operations/OperationsConfirm';

import { voteFormAggregate } from './voteForm';

const flow = createGate<{
  type: 'vote' | 'revote' | null;
  referendum: AggregatedReferendum<OngoingReferendum> | null;
}>({
  defaultState: {
    type: null,
    referendum: null,
  },
});

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flow.open);

const $hasDelegatedTrack = combine(
  {
    referendum: voteFormAggregate.$referendum,
    initiator: voteFormAggregate.$initiator,
    network: networkSelectorModel.$network,
    tracks: delegationAggregate.$activeTracks,
  },
  ({ referendum, initiator, network, tracks }) => {
    if (nullable(initiator) || nullable(referendum) || nullable(network)) {
      return false;
    }

    const initiatorAddress = toAddress(initiator.accountId, { prefix: network.chain.addressPrefix });

    for (const delegators of Object.values(tracks)) {
      for (const [address, tracks] of Object.entries(delegators)) {
        if (address === initiatorAddress && tracks.includes(referendum.track)) {
          return true;
        }
      }
    }

    return false;
  },
);

// Transaction save

const txSaved = createEvent();

sample({
  clock: txSaved,
  source: {
    account: voteFormAggregate.$initiator,
    coreTx: voteFormAggregate.$coreTx,
    txWrappers: voteFormAggregate.$txWrappers,
  },
  filter: nonNullableMap,
  fn: ({ account, coreTx, txWrappers }) => {
    if (!account || !coreTx) return [];

    const tx = {
      initiatorAccountId: account.accountId,
      coreTx,
      txWrappers,
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
  clock: voteFormAggregate.events.formSubmitted,
  fn: () => Step.CONFIRM,
  target: setStep,
});

sample({
  clock: voteConfirmModel.events.sign,
  fn: () => Step.SIGN,
  target: $step,
});

sample({
  clock: voteConfirmModel.events.submitStarted,
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

// Flow management

sample({
  clock: flow.open,
  source: networkSelectorModel.$network,
  filter: (network, { referendum }) => {
    return nonNullable(network) && nonNullable(referendum);
  },
  fn: (network, { type, referendum }) => {
    const voters = referendum!.voting.votes.map((vote) =>
      toAddress(vote.voter, { prefix: network?.chain.addressPrefix }),
    );

    return { type, referendum, voters };
  },
  target: spread({
    type: voteFormAggregate.$type,
    referendum: voteFormAggregate.$referendum,
    voters: voteFormAggregate.$voters,
  }),
});

sample({
  clock: flow.open,
  target: voteFormAggregate.form.reset,
});

sample({
  clock: voteFormAggregate.$initiator,
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
  target: voteFormAggregate.$existingVote,
});

sample({
  clock: voteFormAggregate.$existingVote,
  filter: nonNullable,
  fn: (vote) => {
    if (nullable(vote)) return {};

    return {
      amount: votingService.calculateAccountVoteAmount(vote),
      conviction: votingService.getAccountVoteConviction(vote),
    };
  },
  target: voteFormAggregate.form.setForm,
});

sample({
  clock: flow.close,
  target: voteConfirmModel.events.resetConfirm,
});

sample({
  clock: flow.state,
  source: networkSelectorModel.$network,
  filter: (network, { referendum }) => {
    return nonNullable(network) && nonNullable(referendum);
  },
  fn: (network, { referendum }) => {
    return referendum!.voting.votes.map((vote) => toAddress(vote.voter, { prefix: network?.chain.addressPrefix }));
  },
  target: voteFormAggregate.$voters,
});

// Data bindings

sample({
  clock: voteConfirmModel.events.sign,
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
      multisigTxs: meta.multisigTx ? [meta.multisigTx] : [],
    };
  },
  target: submitModel.events.formInitiated,
});

sample({
  clock: voteConfirmModel.events.submitFinished,
  target: locksModel.events.subscribeLocks,
});

sample({
  clock: voteConfirmModel.events.submitFinished,
  source: {
    status: flow.status,
    wallet: walletModel.$activeWallet,
  },
  filter: ({ status, wallet }) => status && nonNullable(wallet),
  fn: ({ wallet }) => {
    const accountIds = wallet!.accounts.map((a) => a.accountId);

    return { accounts: accountIds };
  },
  target: votingAggregate.events.requestVoting,
});

sample({
  clock: voteConfirmModel.events.submitFinished,
  source: voteFormAggregate.$multisigTx,
  filter: (multisigTx, results) => nonNullable(multisigTx) && results[0]?.result === ExtrinsicResult.SUCCESS,
  fn: () => Paths.OPERATIONS,
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flow.close,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

// Aggregate

export const voteModalAggregate = {
  $lockPeriods: lockPeriodsModel.$lockPeriods,
  $lock: voteFormAggregate.$lockForAccount,
  $existingVote: voteFormAggregate.$existingVote,
  $canSubmit: voteFormAggregate.$canSubmit,
  $hasDelegatedTrack,

  $step,

  events: {
    txSaved,
    setStep,
  },

  gates: {
    flow,
  },
};
