import { type ApiPromise } from '@polkadot/api';
import { combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type AccountVote, type Asset, type BasketTransaction, type Chain, type OngoingReferendum } from '@shared/core';
import { Step, nonNullable, nullable, toAddress } from '@shared/lib/utils';
import { basketModel } from '@entities/basket';
import { referendumModel } from '@entities/governance';
import { transactionBuilder } from '@entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { lockPeriodsModel, locksModel, votingAggregate } from '@/features/governance';
import { createTxStore } from '@features/governance/lib/createTxStore';
import { type SigningPayload, signModel } from '@features/operations/OperationSign';
import { submitModel } from '@features/operations/OperationSubmit';
import { removeVoteConfirmModel } from '@features/operations/OperationsConfirm';
import { type RemoveVoteConfirm } from '@features/operations/OperationsConfirm/Referendum/RemoveVote/model/confirm-model';

const flow = createGate<{
  referendum: OngoingReferendum | null;
  vote: AccountVote | null;
  chain: Chain | null;
  asset: Asset | null;
  api: ApiPromise | null;
}>({
  defaultState: {
    api: null,
    vote: null,
    chain: null,
    asset: null,
    referendum: null,
  },
});

const $account = combine(
  walletModel.$activeWallet,
  flow.state.map(({ chain }) => chain),
  (wallet, chain) => {
    if (nullable(wallet) || nullable(chain)) return null;

    return (
      walletUtils
        .getAccountsBy([wallet], (account) => !accountUtils.isBaseAccount(account) && account.chainId === chain.chainId)
        .at(0) ?? null
    );
  },
);

const $initiatorWallet = combine($account, walletModel.$wallets, (account, wallets) => {
  if (!account) return null;

  return walletUtils.getWalletById(wallets, account.walletId) ?? null;
});

// Transaction

const $coreTx = combine(flow.state, $account, ({ chain, referendum }, account) => {
  if (nullable(account) || nullable(chain) || nullable(referendum)) return null;

  return transactionBuilder.buildRemoveVote({
    accountId: account.accountId,
    chain: chain,
    trackId: referendum.track,
    referendumId: referendum.referendumId,
  });
});

const { $wrappedTx, $txWrappers } = createTxStore({
  $api: flow.state.map(({ api }) => api),
  $chain: flow.state.map(({ chain }) => chain),
  $activeWallet: walletModel.$activeWallet.map((wallet) => wallet ?? null),
  $wallets: walletModel.$wallets,
  $account,
  $coreTx,
});

// Transaction save

const txSaved = createEvent();

sample({
  clock: txSaved,
  source: {
    account: $account,
    transaction: $wrappedTx,
    txWrappers: $txWrappers,
  },
  fn: ({ account, transaction, txWrappers }) => {
    if (nullable(account) || nullable(transaction)) return [];

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

const $step = createStore(Step.CONFIRM);

const setStep = createEvent<Step>();

sample({
  clock: setStep,
  target: $step,
});

sample({
  clock: flow.open,
  fn: () => Step.CONFIRM,
  target: setStep,
});

sample({
  clock: removeVoteConfirmModel.events.sign,
  fn: () => Step.SIGN,
  target: $step,
});

sample({
  clock: removeVoteConfirmModel.events.submitStarted,
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
  source: {
    account: $account,
    wrappedTx: $wrappedTx,
  },
  fn: ({ account, wrappedTx }, { referendum, vote, api, asset, chain }): RemoveVoteConfirm[] => {
    if (
      nullable(account) ||
      nullable(referendum) ||
      nullable(vote) ||
      nullable(asset) ||
      nullable(chain) ||
      nullable(api) ||
      nullable(wrappedTx)
    ) {
      return [];
    }

    const confirm: RemoveVoteConfirm = {
      api,
      chain,
      asset,
      vote,
      account,
      description: '',
      referendumId: referendum.referendumId,
      trackId: referendum.track,
      wrappedTransactions: wrappedTx,
    };

    return [confirm];
  },
  target: removeVoteConfirmModel.events.fillConfirm,
});

sample({
  clock: removeVoteConfirmModel.events.sign,
  source: { confirms: removeVoteConfirmModel.$confirmMap },
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
  source: removeVoteConfirmModel.$confirmMap,
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
  clock: removeVoteConfirmModel.events.submitFinished,
  target: locksModel.events.subscribeLocks,
});

sample({
  clock: removeVoteConfirmModel.events.submitFinished,
  source: flow.state,
  filter: ({ referendum, chain, api }) => nonNullable(referendum) && nonNullable(chain) && nonNullable(api),
  fn: ({ referendum, chain, api }) => ({
    api: api!,
    chain: chain!,
    referendumId: referendum!.referendumId,
  }),
  target: referendumModel.events.requestReferendum,
});

sample({
  clock: removeVoteConfirmModel.events.submitFinished,
  source: {
    account: $account,
    chain: flow.state.map(({ chain }) => chain),
  },
  fn: ({ account, chain }) => {
    const addresses = [account]
      .filter(nonNullable)
      .map((account) => toAddress(account.accountId, { prefix: chain?.addressPrefix }));

    return { addresses };
  },
  target: votingAggregate.events.requestVoting,
});

sample({
  clock: flow.close,
  target: removeVoteConfirmModel.events.resetConfirm,
});

// Aggregate

export const removeVoteModalAggregate = {
  $initiatorWallet,
  $lockPeriods: lockPeriodsModel.$lockPeriods,
  $lock: locksModel.$totalLock,

  $step,

  events: {
    txSaved,
    setStep,
  },

  gates: {
    flow,
  },
};
