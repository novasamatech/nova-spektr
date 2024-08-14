import { createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { spread } from 'patronum';

import { type BasketTransaction, type Conviction, type OngoingReferendum } from '@shared/core';
import { Step, nonNullable, toAddress } from '@shared/lib/utils';
import { basketModel } from '@entities/basket';
import { referendumModel } from '@entities/governance';
import { votingAggregate } from '@features/governance/aggregates/voting';
import { locksModel } from '@features/governance/model/locks';
import { networkSelectorModel } from '@features/governance/model/networkSelector';
import { type SigningPayload, signModel } from '@features/operations/OperationSign';
import { submitModel } from '@features/operations/OperationSubmit';
import { voteConfirmModel } from '@features/operations/OperationsConfirm';

import { voteFormAggregate } from './voteForm';

const flow = createGate<{ conviction: Conviction; referendum: OngoingReferendum }>();

const { form, reinitForm, resetForm, transaction } = voteFormAggregate.transactionForm;

// Transaction save

const txSaved = createEvent();

sample({
  clock: txSaved,
  source: {
    account: form.fields.account.$value,
    transaction: transaction.$wrappedTransactions,
    txWrappers: transaction.$wrappers,
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
  clock: flow.open,
  target: spread({
    conviction: voteFormAggregate.$initialConviction,
    referendum: voteFormAggregate.$referendum,
  }),
});

sample({
  clock: flow.open,
  target: reinitForm,
});

sample({
  clock: flow.close,
  target: resetForm,
});

// Data bindings

sample({
  clock: voteConfirmModel.events.sign,
  source: { confirms: voteConfirmModel.$confirmMap },
  fn: ({ confirms }): { signingPayloads: SigningPayload[] } => {
    const confirm = confirms[0];
    if (!confirm) {
      return { signingPayloads: [] };
    }

    const { meta } = confirm;

    return {
      signingPayloads: [
        {
          account: meta.account,
          chain: meta.chain,
          transaction: meta.wrappedTransactions.wrappedTx,
          signatory: meta.signatory,
        },
      ],
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
      description: meta.description,
      wrappedTxs: [meta.wrappedTransactions.wrappedTx],
      coreTxs: [meta.wrappedTransactions.coreTx],
      multisigTxs: meta.wrappedTransactions.multisigTx ? [meta.wrappedTransactions.multisigTx] : [],
    };
  },
  target: submitModel.events.formInitiated,
});

sample({
  clock: voteConfirmModel.events.submitFinished,
  target: locksModel.events.getTracksLocks,
});

sample({
  clock: voteConfirmModel.events.submitFinished,
  source: {
    referendum: voteFormAggregate.$referendum,
    chain: networkSelectorModel.$governanceChain,
    api: networkSelectorModel.$governanceChainApi,
  },
  filter: ({ referendum, chain, api }) => nonNullable(referendum) && nonNullable(chain) && nonNullable(api),
  fn: ({ referendum, chain, api }) => ({
    chain: chain!,
    api: api!,
    referendumId: referendum!.referendumId,
  }),
  target: referendumModel.events.requestReferendum,
});

sample({
  clock: voteConfirmModel.events.submitFinished,
  source: {
    form: voteFormAggregate.transactionForm.form.$values,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ chain }) => nonNullable(chain),
  fn: ({ form, chain }) => {
    const addresses = [form.signatory, form.account]
      .filter(nonNullable)
      .map((account) => toAddress(account.accountId, { prefix: chain?.addressPrefix }));

    return { addresses };
  },
  target: votingAggregate.events.requestVoting,
});

// Aggregate

export const voteModalAggregate = {
  ...voteFormAggregate.transactionForm,

  $lock: locksModel.$totalLock,
  $fee: voteFormAggregate.$fee,
  $initialConviction: voteFormAggregate.$initialConviction,
  $availableBalance: voteFormAggregate.$availableBalance,
  $isFeeLoading: voteFormAggregate.$isFeeLoading,
  $canSubmit: voteFormAggregate.$canSubmit,

  $step,

  events: {
    txSaved,
    setStep,
  },

  gates: {
    flow,
  },
};
