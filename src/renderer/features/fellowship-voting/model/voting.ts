import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';
import { reshape, spread } from 'patronum';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { createTxStore } from '@/shared/transactions';
import { votingService } from '@/domains/collectives';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';

import { fellowshipVotingFeature } from './feature';
import { votingStatus } from './votingStatus';

const flow = createGate<{ vote: 'aye' | 'nay' | null }>({ defaultState: { vote: null } });

const $vote = flow.state.map(({ vote }) => vote);

const { $api, $chain, $wallets } = reshape({
  source: fellowshipVotingFeature.input,
  shape: {
    $api: x => x?.api ?? null,
    $wallets: x => x?.wallets ?? [],
    $chain: x => x?.chain ?? null,
  },
});

const $coreTx = combine(
  {
    input: fellowshipVotingFeature.input,
    account: votingStatus.$votingAccount,
    referendum: votingStatus.$referendum,
    member: votingStatus.$currentMember,
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

const $votingWallet = combine($wallets, votingStatus.$votingAccount, (wallets, account) => {
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
  $account: votingStatus.$votingAccount,
});

// Signing

const sign = createEvent();
const signPayloadCreated = createEvent<SigningPayload | null>();

sample({
  clock: sign,
  source: {
    transactions: $wrappedTx,
    account: votingStatus.$votingAccount,
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
    account: votingStatus.$votingAccount,
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

type SaveToBasketParams = {
  referendumId: ReferendumId;
  vote: 'aye' | 'nay';
};

const saveToBasket = createEvent<SaveToBasketParams>();
const removeFromBasket = createEvent<ReferendumId>();

sample({
  clock: saveToBasket,
  source: {
    existing: basketOperations.$list,
    account: votingStatus.$votingAccount,
    member: votingStatus.$currentMember,
    input: fellowshipVotingFeature.input,
  },
  fn: ({ existing, account, member, input }, params) => {
    if (nullable(account) || nullable(member) || nullable(input) || nullable(input.chain)) {
      return {
        add: [],
        remove: [],
      };
    }

    const coreTx = votingService.createVoteTransaction({
      pallet: 'fellowship',
      rank: member.rank,
      account,
      chain: input.chain,
      aye: params.vote === 'aye',
      referendumId: params.referendumId,
    });

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
    account: votingStatus.$votingAccount,
  },
  fn: ({ existing, account }, referendumId) => {
    if (nullable(account)) {
      return [];
    }

    return existing.filter(o => {
      if (o.initiatorAccountId !== account.accountId) return false;
      if (!votingService.isVotingTransaction(o.coreTx)) return false;

      return o.coreTx.args.poll === referendumId;
    });
  },
  target: basketOperations.removeTransactions,
});

export const $inBasket = combine(
  {
    basket: basketOperations.$list,
    referendum: votingStatus.$referendum,
    account: votingStatus.$votingAccount,
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
