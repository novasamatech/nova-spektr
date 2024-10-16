import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';
import { reshape } from 'patronum';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { createTxStore } from '@/shared/transactions';
import { collectiveDomain } from '@/domains/collectives';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';

import { votingFeatureStatus } from './status';
import { votingStatusModel } from './votingStatus';

const gate = createGate<{ vote: 'aye' | 'nay' | null }>({ defaultState: { vote: null } });

const $vote = gate.state.map(({ vote }) => vote);

const { $api, $activeWallet, $chain, $wallets } = reshape({
  source: votingFeatureStatus.input,
  shape: {
    $api: x => x?.api ?? null,
    $activeWallet: x => x?.wallet ?? null,
    $wallets: x => x?.wallets ?? [],
    $chain: x => x?.chain ?? null,
  },
});

const $coreTx = combine(
  {
    input: votingFeatureStatus.input,
    account: votingStatusModel.$votingAccount,
    referendum: votingStatusModel.$referendum,
    vote: $vote,
  },
  ({ input, referendum, account, vote }) => {
    if (nullable(input) || nullable(referendum) || nullable(account) || nullable(vote)) return null;

    return collectiveDomain.votingService.createVoteTransaction({
      pallet: 'fellowship',
      account,
      chain: input.chain,
      aye: vote === 'aye',
      referendumId: referendum.id,
    });
  },
);

const { $fee, $wrappedTx, $txWrappers } = createTxStore({
  $api,
  $activeWallet,
  $wallets,
  $chain,
  $coreTx,
  $account: votingStatusModel.$votingAccount,
});

// Signing

const sign = createEvent();
const signPayloadCreated = createEvent<SigningPayload | null>();

sample({
  clock: sign,
  source: { transactions: $wrappedTx, account: votingStatusModel.$votingAccount, chain: $chain },
  fn: ({ transactions, account, chain }) => {
    if (nullable(transactions) || nullable(account) || nullable(chain)) return null;

    return {
      chain,
      account,
      transaction: transactions.wrappedTx,
    };
  },
  target: signPayloadCreated,
});

sample({
  clock: signPayloadCreated.filter({ fn: nonNullable }),
  fn: payload => ({ signingPayloads: [payload] }),
  target: signModel.events.formInitiated,
});

export const votingModel = {
  gate,
  $fee,
  $wrappedTx,
  $txWrappers,
  sign,
};
