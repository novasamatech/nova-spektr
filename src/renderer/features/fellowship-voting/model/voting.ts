import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';
import { reshape } from 'patronum';

import { type BasketTransaction } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { createTxStore } from '@/shared/transactions';
import { votingService } from '@/domains/collectives';
import { basketOperations } from '@/aggregates/basket-operations';
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

const { $fee, $wrappedTx, $txWrappers } = createTxStore({
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
      multisigTxs: transactions!.multisigTx ? [transactions!.multisigTx] : [],
    };
  },
  target: submitModel.events.formInitiated,
});

// Basket

const saveToBasket = createEvent();
const basketSaveRequestCreated = createEvent<BasketTransaction | null>();

sample({
  clock: saveToBasket,
  source: {
    transactions: $wrappedTx,
    account: votingStatus.$votingAccount,
    txWrappers: $txWrappers,
  },
  fn: ({ account, transactions, txWrappers }) => {
    if (nullable(account) || nullable(transactions)) {
      return null;
    }

    // @ts-expect-error TODO fix id field
    const tx: BasketTransaction = {
      initiatorAccountId: account.accountId,
      coreTx: transactions.coreTx,
      txWrappers,
    };

    return tx;
  },
  target: basketSaveRequestCreated,
});

sample({
  clock: basketSaveRequestCreated.filter({ fn: nonNullable }),
  fn: tx => [tx],
  target: basketOperations.addTransactions,
});

export const voting = {
  flow,
  $fee,
  $wrappedTx,
  $txWrappers,
  sign,
  saveToBasket,
};
