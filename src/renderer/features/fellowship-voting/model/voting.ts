import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';
import { reshape, spread } from 'patronum';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { createTxStore } from '@/shared/transactions';
import { type OngoingReferendum, votingService } from '@/domains/collectives';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';

import { fellowshipVotingFeature } from './feature';

const flow = createGate<{ referendum: OngoingReferendum | null; vote: 'aye' | 'nay' | null }>({
  defaultState: { referendum: null, vote: null },
});

const $referendum = flow.state.map(({ referendum }) => referendum);
const $vote = flow.state.map(({ vote }) => vote);

const { $api, $chain, $account, $member, $wallets } = reshape({
  source: fellowshipVotingFeature.input,
  shape: {
    $api: x => x?.api ?? null,
    $wallets: x => x?.wallets ?? [],
    $chain: x => x?.chain ?? null,
    $account: x => x?.account ?? null,
    $member: x => x?.member ?? null,
  },
});

const $coreTx = combine(
  {
    input: fellowshipVotingFeature.input,
    account: $account,
    referendum: $referendum,
    member: $member,
    vote: $vote,
  },
  ({ input, referendum, account, member, vote }) => {
    if (nullable(input) || nullable(referendum) || nullable(member) || nullable(account) || nullable(vote)) {
      return null;
    }

    return votingService.createVoteTransaction({
      pallet: 'fellowship',
      rank: member.rank,
      account,
      chain: input.chain,
      aye: vote === 'aye',
      referendumId: referendum.id,
    });
  },
);

const $votingWallet = combine($wallets, $account, (wallets, account) => {
  if (nullable(account)) return null;

  return wallets.find(w => w.id === account.walletId) ?? null;
});

const { $fee, $wrappedTx } = createTxStore({
  $active: flow.status,
  $api,
  $activeWallet: $votingWallet,
  $wallets,
  $chain,
  $coreTx,
  $account,
});

// Signing

const sign = createEvent();
const signPayloadCreated = createEvent<SigningPayload | null>();

sample({
  clock: sign,
  source: {
    transactions: $wrappedTx,
    account: $account,
    chain: $chain,
  },
  fn: ({ transactions, account, chain }) => {
    if (nullable(transactions) || nullable(account) || nullable(chain)) {
      return null;
    }

    return {
      chain,
      account,
      transaction: transactions.wrappedTx,
      signatory: null,
    };
  },
  target: signPayloadCreated,
});

sample({
  clock: signPayloadCreated.filter({ fn: nonNullable }),
  fn: payload => ({ signingPayloads: [payload] }),
  target: signModel.events.formInitiated,
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    open: flow.status,
    transactions: $wrappedTx,
    account: $account,
    chain: $chain,
  },
  filter: ({ open, transactions, account, chain }) => {
    return open && nonNullable(chain) && nonNullable(transactions) && nonNullable(account);
  },
  fn({ transactions, account, chain }, signParams) {
    return {
      signatures: signParams.signatures,
      txPayloads: signParams.txPayloads,

      chain: chain!,
      account: account!,
      wrappedTxs: [transactions!.wrappedTx],
      coreTxs: [transactions!.coreTx],
    };
  },
  target: submitModel.events.formInitiated,
});

// Basket

const saveToBasket = createEvent();
const removeFromBasket = createEvent();

sample({
  clock: saveToBasket,
  source: {
    existing: basketOperations.$list,
    account: $account,
    coreTx: $coreTx,
  },
  fn: ({ existing, account, coreTx }) => {
    if (nullable(account) || nullable(coreTx)) {
      return {
        add: [],
        remove: [],
      };
    }

    const existingTransactions = existing.filter(o => {
      if (o.initiatorAccountId !== account.accountId) return false;
      if (!votingService.isVotingTransaction(o.coreTx)) return false;

      return coreTx.args.poll === o.coreTx.args.poll;
    });

    const isSameTransaction = existingTransactions.some(t => coreTx.args.aye === t.coreTx.args.aye);

    const newTransaction: BasketTransactionDraft = {
      initiatorAccountId: account.accountId,
      coreTx,
      route: [],
      createdAt: Date.now(),
    };

    return {
      add: isSameTransaction ? [] : [newTransaction],
      remove: existingTransactions,
    };
  },
  target: spread({
    add: basketOperations.addTransactions,
    remove: basketOperations.removeTransactions,
  }),
});

sample({
  clock: removeFromBasket,
  source: {
    existing: basketOperations.$list,
    account: $account,
    coreTx: $coreTx,
  },
  fn: ({ existing, account, coreTx }) => {
    if (nullable(account) || nullable(coreTx)) {
      return [];
    }

    const existingTransactions = existing.filter(o => {
      if (o.initiatorAccountId !== account.accountId) return false;
      if (!votingService.isVotingTransaction(o.coreTx)) return false;

      return coreTx.args.poll === o.coreTx.args.poll;
    });

    return existingTransactions;
  },
  target: basketOperations.removeTransactions,
});

export const $inBasket = combine(
  {
    basket: basketOperations.$list,
    referendum: $referendum,
    account: $account,
  },
  ({ basket, referendum, account }) => {
    if (!referendum || !account) return { aye: false, nay: false };

    const existing = basket.filter(o => {
      if (o.initiatorAccountId !== account.accountId) return false;
      if (!votingService.isVotingTransaction(o.coreTx)) return false;
      return o.coreTx.args.poll === referendum.id;
    });

    return {
      aye: existing.some(t => t.coreTx.args.aye === true),
      nay: existing.some(t => t.coreTx.args.aye === false),
    };
  },
);

export const voting = {
  flow,
  $fee,
  $wrappedTx,
  $inBasket,
  sign,
  saveToBasket,
  removeFromBasket,
};
