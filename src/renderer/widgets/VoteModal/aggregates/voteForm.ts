import { type BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { and, empty, not, reset } from 'patronum';

import {
  type AccountVote,
  type Address,
  type Conviction,
  type OngoingReferendum,
  type Transaction,
} from '@/shared/core';
import { getNativeAsset, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { createComplexTxStore, createSignatoriesStore, createTxWrappers } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { locksService, voteTransactionService } from '@/entities/governance';
import { transactionBuilder } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type AggregatedReferendum, networkSelectorModel } from '@/features/governance';
import { locksAggregate } from '@/features/governance/aggregates/locks';
import { voteValidateModel } from '@/features/governance/model/vote/voteValidateModel';
import { votingAssetModel } from '@/features/governance/model/votingAsset';
import { getLocksForAddress } from '@/features/governance/utils/getLocksForAddress';
import { type VoteConfirm, voteConfirmModel } from '@/features/operations/OperationsConfirm';

type Form = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: BN | null;
  conviction: Conviction;
  decision: 'aye' | 'nay' | 'abstain' | null;
};

type FormInput = {
  form: Form;
  transaction: Transaction;
};

const $type = createStore<'vote' | 'revote' | null>(null);
const $voters = createStore<Address[]>([]);
const $existingVote = createStore<AccountVote | null>(null);
const $referendum = createStore<AggregatedReferendum<OngoingReferendum> | null>(null);
const $availableBalance = createStore(BN_ZERO);
const $lockForAccount = createStore(BN_ZERO);

const $canSubmit = createStore(false);

const formSubmitted = createEvent<FormInput>();

// form

const form = createForm<Form>({
  validateOn: ['submit'],
  fields: {
    initiator: {
      init: null,
      rules: [
        {
          name: 'emptyInitiator',
          errorText: 'governance.vote.errors.noAccountError',
          validator: nonNullable,
        },
      ],
    },
    signatory: {
      init: null,
      rules: [
        {
          name: 'emptySignatory',
          errorText: 'governance.vote.errors.noSignatoryError',
          validator: nonNullable,
        },
      ],
    },
    amount: {
      init: null,
      rules: [
        {
          name: 'notZero',
          errorText: 'transfer.notZeroAmountError',
          validator: (value) => nonNullable(value) && value.gt(BN_ZERO),
        },
        {
          name: 'notEnoughBalance',
          errorText: 'governance.errors.notEnoughBalanceError',
          source: $availableBalance,
          validator: (value, _, balance: BN) => nullable(value) || value.lte(balance),
        },
      ],
    },
    conviction: { init: 'Locked1x' },
    decision: { init: null },
  },
});

// initiators

const $initiators = combine(
  walletSelect.$selectedAccounts,
  networkSelectorModel.$governanceChain,
  (accounts, chain) => {
    return chain ? (accountService.filterAccountsOnChain(accounts, chain) ?? []) : [];
  },
);

sample({
  clock: form.reset,
  source: $initiators,
  filter: (initiators) => initiators.length === 1,
  fn: (initiators) => initiators.at(0) ?? null,
  target: form.fields.initiator.onChange,
});

const $initiatorWallet = combine(walletModel.$wallets, form.fields.initiator.$value, (wallets, initiator) => {
  if (nullable(initiator)) return null;

  return wallets.find((w) => initiator.walletId === w.id);
});

// signatories

const $signatories = createSignatoriesStore({
  chain: networkSelectorModel.$governanceChain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

sample({
  clock: form.reset,
  source: $signatories,
  filter: (signatories) => signatories.length === 1,
  fn: (signatories) => signatories.at(0) ?? null,
  target: form.fields.signatory.onChange,
});

// transaction

const $coreTx = combine(
  {
    chain: networkSelectorModel.$governanceChain,
    referendum: $referendum,
    existingVote: $existingVote,
    conviction: form.fields.conviction.$value,
    initiator: form.fields.initiator.$value,
    amount: form.fields.amount.$value,
    decision: form.fields.decision.$value,
  },
  ({ chain, referendum, initiator, amount, conviction, decision, existingVote }) => {
    if (nullable(referendum) || nullable(chain) || nullable(initiator)) {
      return null;
    }

    if (existingVote) {
      return transactionBuilder.buildRevote({
        chain: chain,
        accountId: initiator.accountId,
        trackId: referendum.track,
        referendumId: referendum.referendumId,
        vote: voteTransactionService.createTransactionVote(decision ?? 'aye', amount || BN_ZERO, conviction),
      });
    }

    return transactionBuilder.buildVote({
      chain: chain,
      accountId: initiator.accountId,
      trackId: referendum.track,
      referendumId: referendum.referendumId,
      vote: voteTransactionService.createTransactionVote(decision ?? 'aye', amount || BN_ZERO, conviction),
    });
  },
);

const { $fee, $pendingFee, $tx, $multisigTx, $route } = createComplexTxStore({
  api: networkSelectorModel.$governanceChainApi,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: networkSelectorModel.$governanceChain,
  transaction: $coreTx,
});

const $txWrappers = createTxWrappers({
  initiator: form.fields.initiator.$value,
  wallets: walletModel.$wallets,
  wallet: walletSelect.$selectedWallet,
  chain: networkSelectorModel.$governanceChain,
  signatory: form.fields.signatory.$value,
});

// balances

sample({
  clock: [form.fields.initiator.$value, form.reset],
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
  clock: [form.fields.initiator.$value, $referendum, form.reset],
  source: {
    initiator: form.fields.initiator.$value,
    referendum: $referendum,
    chain: networkSelectorModel.$governanceChain,
    balances: balanceModel.$balances,
    accounts: accounts.$list,
  },
  filter: ({ referendum, chain, initiator }) => nonNullable(initiator) && nonNullable(chain) && nonNullable(referendum),
  fn: ({ referendum, balances, chain, initiator }) => {
    if (!initiator || !referendum) return BN_ZERO;

    const nativeAsset = getNativeAsset(chain?.assets ?? []);
    const accountBalance = balanceUtils.getBalance(
      balances,
      initiator!.accountId,
      chain!.chainId,
      nativeAsset.assetId.toString(),
    );
    if (!accountBalance) return BN_ZERO;

    return locksService.getAvailableBalance(accountBalance);
  },
  target: $availableBalance,
});

// Reset

reset({
  clock: form.reset,
  target: [$referendum, $existingVote],
});

// Submit

sample({
  clock: and(
    not($pendingFee),
    not(empty($tx)),
    not(empty(votingAssetModel.$votingAsset)),
    not(empty(networkSelectorModel.$governanceChainId)),
  ),
  target: $canSubmit,
});

sample({
  clock: form.formValidated,
  source: {
    form: form.$values,
    transaction: $tx,
  },
  filter: ({ transaction }) => nonNullable(transaction),
  fn: ({ form, transaction }) => {
    return {
      form,
      transaction: transaction!,
    } satisfies FormInput;
  },
  target: formSubmitted,
});

sample({
  clock: form.formValidated,
  source: {
    form: form.$values,
    existingVote: $existingVote,
    initiator: form.fields.initiator.$value,
    network: networkSelectorModel.$network,
    route: $route,
    tx: $tx,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
  },
  filter: ({ network, tx, initiator }, { decision }) => {
    return nonNullable(network) && nonNullable(initiator) && nonNullable(decision) && nonNullable(tx);
  },
  fn: ({ existingVote, network, tx, coreTx, multisigTx, route, initiator }, { signatory }): VoteConfirm => {
    return {
      api: network!.api,
      chain: network!.chain,
      asset: network!.asset,
      route,
      initiator: initiator!,
      signatory: signatory!,
      existingVote,
      tx: tx!,
      coreTx: coreTx!,
      multisigTx,
    };
  },
  target: voteConfirmModel.events.replaceWithConfirm,
});

sample({
  clock: form.$values,
  source: $tx,
  filter: nonNullable,
  fn: (transaction) => ({
    id: 0,
    transaction: transaction!,
    feeMap: {},
  }),
  target: voteValidateModel.validate,
});

export const voteFormAggregate = {
  form,

  $tx,
  $coreTx,
  $multisigTx,
  $txWrappers,

  $initiatorWallet,
  $initiators,
  $signatories,
  $type,
  $referendum,
  $voters,
  $existingVote,
  $lockForAccount,
  $availableBalance,

  $fee,
  $pendingFee,

  $canSubmit,

  events: {
    formSubmitted,
  },
};
