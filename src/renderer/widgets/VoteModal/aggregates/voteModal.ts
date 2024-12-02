import { combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type AccountVote, type Address, type BasketTransaction, type OngoingReferendum } from '@/shared/core';
import { Step, isStep, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { basketModel } from '@/entities/basket';
import { votingService } from '@/entities/governance';
import { walletModel } from '@/entities/wallet';
import {
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
  referendum: OngoingReferendum | null;
  votes: { voter: Address; vote: AccountVote }[];
}>({
  defaultState: {
    votes: [],
    referendum: null,
  },
});

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flow.open);

const $hasDelegatedTrack = combine(
  {
    referendum: voteFormAggregate.$referendum,
    account: voteFormAggregate.transactionForm.form.fields.account.$value,
    network: networkSelectorModel.$network,
    tracks: delegationAggregate.$activeTracks,
  },
  ({ referendum, account, network, tracks }) => {
    if (nullable(account) || nullable(referendum) || nullable(network)) {
      return false;
    }

    const accountAddress = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

    for (const dalegators of Object.values(tracks)) {
      for (const [address, tracks] of Object.entries(dalegators)) {
        if (address === accountAddress && tracks.includes(referendum.track)) {
          return true;
        }
      }
    }

    return false;
  },
);

const { form, reinitForm, resetForm, transaction } = voteFormAggregate.transactionForm;

// Transaction save

const txSaved = createEvent();

sample({
  clock: txSaved,
  source: {
    account: form.fields.account.$value,
    transaction: transaction.$wrappedTx,
    txWrappers: transaction.$txWrappers,
  },
  filter: ({ account, transaction }) => !!account && !!transaction,
  fn: ({ account, transaction, txWrappers }) => {
    if (!account || !transaction) return [];

    // @ts-expect-error TODO fix id field
    const tx: BasketTransaction = {
      initiatorWallet: account.walletId,
      coreTx: transaction.coreTx,
      txWrappers,
    };

    return [tx];
  },
  target: basketModel.events.transactionsCreated,
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
  fn: ({ referendum }) => referendum,
  target: voteFormAggregate.$referendum,
});

sample({
  clock: form.fields.account.$value,
  source: { state: flow.state, network: networkSelectorModel.$network },
  fn: ({ state, network }, account) => {
    if (nullable(account) || nullable(network) || state.votes.length === 0) return null;

    const record = state.votes.find(({ voter }) => {
      return voter === toAddress(account.accountId, { prefix: network.chain.addressPrefix });
    });

    if (!record) return null;

    return record.vote;
  },
  target: voteFormAggregate.$existingVote,
});

sample({
  clock: flow.open,
  target: reinitForm,
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
  target: form.setForm,
});

sample({
  clock: flow.close,
  target: [resetForm, voteConfirmModel.events.resetConfirm],
});

sample({
  clock: flow.state,
  fn: ({ votes }) => votes.map((x) => x.voter),
  target: voteFormAggregate.$voters,
});

// Data bindings

sample({
  clock: voteConfirmModel.events.sign,
  source: { confirms: voteConfirmModel.$confirmMap },
  fn: ({ confirms }): { signingPayloads: SigningPayload[] } => {
    if (!confirms) {
      return { signingPayloads: [] };
    }

    return {
      signingPayloads: Object.values(confirms).map(({ meta, accounts }) => ({
        account: accounts.proxy || accounts.initiator,
        chain: meta.chain,
        transaction: meta.wrappedTransactions.wrappedTx,
        signatory: accounts.signer,
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
      account: meta.account,
      signatory: meta.signatory,
      wrappedTxs: [meta.wrappedTransactions.wrappedTx],
      coreTxs: [meta.wrappedTransactions.coreTx],
      multisigTxs: meta.wrappedTransactions.multisigTx ? [meta.wrappedTransactions.multisigTx] : [],
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
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ chain, status, wallet }) => status && nonNullable(chain) && nonNullable(wallet),
  fn: ({ wallet, chain }) => {
    const addresses = wallet!.accounts.map((account) => toAddress(account.accountId, { prefix: chain?.addressPrefix }));

    return { addresses };
  },
  target: votingAggregate.events.requestVoting,
});

sample({
  clock: voteConfirmModel.events.submitFinished,
  source: transaction.$isMultisig,
  filter: (isMultisig, results) => isMultisig && results[0]?.result === ExtrinsicResult.SUCCESS,
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
  ...voteFormAggregate.transactionForm,

  $lockPeriods: lockPeriodsModel.$lockPeriods,
  $lock: voteFormAggregate.$lockForAccount,
  $existingVote: voteFormAggregate.$existingVote,
  $availableBalance: voteFormAggregate.$availableBalance,
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
