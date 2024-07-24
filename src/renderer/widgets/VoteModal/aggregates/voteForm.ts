import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createStore, sample } from 'effector';
import { isNil } from 'lodash';
import { and, empty, not, reset } from 'patronum';

import { type Conviction, type OngoingReferendum } from '@shared/core';
import { balanceModel } from '@entities/balance';
import { voteTransactionService } from '@entities/governance';
import { transactionBuilder } from '@entities/transaction';
import { walletModel } from '@entities/wallet';
import { createFeeCalculator } from '@features/governance/lib/createFeeCalculator';
import { createTransactionForm } from '@features/governance/lib/createTransactionForm';
import { locksModel } from '@features/governance/model/locks';
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

const $initialAmount = createStore(BN_ZERO);
const $initialConviction = createStore<Conviction>('None');
const $referendum = createStore<OngoingReferendum | null>(null);
const $availableBalance = createStore(BN_ZERO);

const $canSubmit = createStore(false);

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
      },
      ({ chain, referendum, account, amount, conviction }) => {
        if (!referendum || !chain || !account) {
          return null;
        }

        return transactionBuilder.buildVote({
          chain: chain,
          accountId: account.accountId,
          trackId: referendum.track,
          referendumId: referendum.referendumId,
          vote: voteTransactionService.createTransactionVote('aye', amount, conviction),
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
          // {
          //   name: 'insufficientBalanceForFee',
          //   errorText: 'transfer.notEnoughBalanceForFeeError',
          //   source: $accountsBalances,
          //   validator: (value, form, accountsBalances) => {
          //     return form.shards.every((_: Account, index: number) => {
          //       return value.lte(new BN(accountsBalances[index].balance));
          //     });
          //   },
          // },
        ],
      },
      conviction: { init: 'Locked1x' },
      decision: { init: null },
      description: { init: '' },
    },
  },
});

const { form, resetForm, transaction, accounts } = transactionForm;

const {
  $: $fee,
  $pending: $feePending,
  drop: dropFee,
} = createFeeCalculator({
  $transaction: transaction.$wrappedTransactions.map((x) => (x ? x.wrappedTx : null)),
  $api: networkSelectorModel.$governanceChainApi,
});

sample({
  clock: [form.fields.account.$value, form.fields.signatory.$value],
  source: {
    referendum: $referendum,
    locks: locksModel.$trackLocks,
    accounts: accounts.$available,
  },
  filter: ({ referendum }, account) => !isNil(account) && !isNil(referendum),
  fn: ({ referendum, locks, accounts }, account) => {
    if (!account || !referendum) return BN_ZERO;

    const accountBalance = accounts.find((x) => x.account.accountId === account.accountId)?.balance ?? BN_ZERO;
    if (!accountBalance) return BN_ZERO;

    const lockForAccount = locks[account.accountId]?.[referendum.track];

    return BN.max(BN_ZERO, accountBalance.sub(lockForAccount ?? BN_ZERO));
  },
  target: $availableBalance,
});

// Reset

reset({
  clock: resetForm,
  target: [$referendum, $initialAmount, $initialConviction],
});

sample({
  clock: resetForm,
  target: dropFee,
});

// Submit

sample({
  clock: and(
    not($feePending),
    not(empty(transaction.$wrappedTransactions)),
    not(empty(votingAssetModel.$votingAsset)),
    not(empty(networkSelectorModel.$governanceChain)),
  ),
  target: $canSubmit,
});

sample({
  clock: form.formValidated,
  source: {
    form: form.$values,
    initialConviction: $initialConviction,
    initialAmount: $initialAmount,
    asset: votingAssetModel.$votingAsset,
    chain: networkSelectorModel.$governanceChain,
    wrappedTransactions: transaction.$wrappedTransactions,
  },
  filter: ({ form, chain, asset, wrappedTransactions }) =>
    !!form.account && !!form.decision && !!chain && !!asset && !!wrappedTransactions,
  fn: ({ form, initialConviction, initialAmount, asset, chain, wrappedTransactions }): VoteConfirm => {
    return {
      account: form.account!,
      initialAmount,
      asset: asset!,
      chain: chain!,
      description: form.description,
      initialConviction,
      wrappedTransactions: wrappedTransactions!,
    };
  },
  target: voteConfirmModel.events.replaceConfirm,
});

sample({
  clock: form.$values,
  source: transaction.$wrappedTransactions,
  filter: (transactions) => transactions !== null,
  fn: (transactions) => ({
    id: 0,
    transaction: transactions!.wrappedTx,
  }),
  target: voteValidateModel.events.validationStarted,
});

export const voteFormAggregate = {
  transactionForm,

  $fee,
  $referendum,
  $initialAmount,
  $initialConviction,
  $isFeeLoading: $feePending,

  $availableBalance,

  $canSubmit,
};
