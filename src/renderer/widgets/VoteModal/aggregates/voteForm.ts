import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { isNil } from 'lodash';
import { and, empty, not, reset } from 'patronum';

import { type AccountVote, type Conviction, type OngoingReferendum } from '@shared/core';
import { nonNullable, toAddress } from '@shared/lib/utils';
import { balanceModel } from '@entities/balance';
import { voteTransactionService } from '@entities/governance';
import { type WrappedTransactions, transactionBuilder } from '@entities/transaction';
import { walletModel } from '@entities/wallet';
import { locksAggregate } from '@/features/governance/aggregates/locks';
import { getLocksForAddress } from '@/features/governance/utils/getLocksForAddress';
import { type BasicFormParams, createTransactionForm } from '@features/governance/lib/createTransactionForm';
import { networkSelectorModel } from '@features/governance/model/networkSelector';
import { voteValidateModel } from '@features/governance/model/vote/voteValidateModel';
import { votingAssetModel } from '@features/governance/model/votingAsset';
import { type VoteConfirm, voteConfirmModel } from '@features/operations/OperationsConfirm';

type Form = {
  amount: BN;
  conviction: Conviction;
  description: string;
  decision: 'aye' | 'nay' | 'abstain' | null;
};

type FormInput = {
  form: BasicFormParams & Form;
  wrappedTransactions: WrappedTransactions;
};

const $existingVote = createStore<AccountVote | null>(null);
const $referendum = createStore<OngoingReferendum | null>(null);
const $availableBalance = createStore(BN_ZERO);
const $lockForAccount = createStore(BN_ZERO);

const $canSubmit = createStore(false);

const formSubmitted = createEvent<FormInput>();

const transactionForm = createTransactionForm<Form>({
  $asset: votingAssetModel.$votingAsset,
  $chain: networkSelectorModel.$governanceChain,
  $api: networkSelectorModel.$governanceChainApi,

  $activeWallet: walletModel.$activeWallet.map((x) => x ?? null),
  $wallets: walletModel.$wallets,
  $balances: balanceModel.$balances,

  createTransactionStore: ({ $chain, form }) =>
    combine(
      {
        chain: $chain,
        referendum: $referendum,
        conviction: form.fields.conviction.$value,
        account: form.fields.account.$value,
        amount: form.fields.amount.$value,
        decision: form.fields.decision.$value,
      },
      ({ chain, referendum, account, amount, conviction, decision }) => {
        if (!referendum || !chain || !account) {
          return null;
        }

        return transactionBuilder.buildVote({
          chain: chain,
          accountId: account.accountId,
          trackId: referendum.track,
          referendumId: referendum.referendumId,
          vote: voteTransactionService.createTransactionVote(decision ?? 'aye', amount, conviction),
        });
      },
    ),

  form: {
    filter: createStore(true),
    validateOn: ['submit'],
    fields: {
      amount: {
        init: BN_ZERO,
        rules: [
          {
            name: 'notZero',
            errorText: 'transfer.notZeroAmountError',
            validator: (value) => value.gt(BN_ZERO),
          },
          {
            name: 'notEnoughBalance',
            errorText: 'governance.errors.notEnoughBalanceError',
            source: $availableBalance,
            validator: (value, _, balance: BN) => value.lte(balance),
          },
        ],
      },
      conviction: { init: 'Locked1x' },
      decision: { init: null },
      description: { init: '' },
    },
  },
});

const { form, resetForm, transaction, accounts } = transactionForm;

sample({
  clock: form.fields.account.onChange,
  source: {
    trackLocks: locksAggregate.$trackLocks,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ chain }, account) => nonNullable(account) && nonNullable(chain),
  fn: ({ trackLocks, chain }, account) => {
    const address = toAddress(account!.accountId, { prefix: chain!.addressPrefix });

    return getLocksForAddress(address, trackLocks);
  },
  target: $lockForAccount,
});

sample({
  clock: form.fields.account.onChange,
  source: {
    referendum: $referendum,
    accounts: accounts.$available,
    lockForAccount: $lockForAccount,
  },
  filter: ({ referendum }, account) => !isNil(account) && !isNil(referendum),
  fn: ({ referendum, accounts, lockForAccount }, account) => {
    if (!account || !referendum) return BN_ZERO;

    const accountBalance = accounts.find((x) => x.account.accountId === account.accountId)?.balance ?? BN_ZERO;
    if (!accountBalance) return BN_ZERO;

    return BN.max(BN_ZERO, accountBalance.add(lockForAccount ?? BN_ZERO));
  },
  target: $availableBalance,
});

// Reset

reset({
  clock: resetForm,
  target: [$referendum, $existingVote],
});

// Submit

sample({
  clock: and(
    not(transaction.$pendingFee),
    not(empty(transaction.$wrappedTx)),
    not(empty(votingAssetModel.$votingAsset)),
    not(empty(networkSelectorModel.$governanceChain)),
  ),
  target: $canSubmit,
});

sample({
  clock: form.formValidated,
  source: {
    form: form.$values,
    wrappedTransactions: transaction.$wrappedTx,
  },
  filter: ({ wrappedTransactions }) => nonNullable(wrappedTransactions),
  fn: ({ form, wrappedTransactions }) => {
    return {
      form,
      wrappedTransactions: wrappedTransactions!,
    };
  },
  target: formSubmitted,
});

sample({
  clock: form.formValidated,
  source: {
    form: form.$values,
    existingVote: $existingVote,
    network: networkSelectorModel.$network,
    wrappedTransactions: transaction.$wrappedTx,
  },
  filter: ({ network, wrappedTransactions }, { account, decision }) => {
    return nonNullable(network) && nonNullable(account) && nonNullable(decision) && nonNullable(wrappedTransactions);
  },
  fn: ({ existingVote, network, wrappedTransactions }, { account, signatory, description }): VoteConfirm => {
    return {
      api: network!.api,
      chain: network!.chain,
      asset: network!.asset,
      account: account!,
      signatory: signatory ?? undefined,
      description: description,
      existingVote,
      wrappedTransactions: wrappedTransactions!,
    };
  },
  target: voteConfirmModel.events.replaceWithConfirm,
});

sample({
  clock: form.$values,
  source: transaction.$wrappedTx,
  filter: (transactions) => transactions !== null,
  fn: (transactions) => ({
    id: 0,
    transaction: transactions!.wrappedTx,
  }),
  target: voteValidateModel.events.validationStarted,
});

export const voteFormAggregate = {
  transactionForm,

  $referendum,
  $existingVote,
  $lockForAccount,
  $availableBalance,

  $canSubmit,

  events: {
    formSubmitted,
  },
};
