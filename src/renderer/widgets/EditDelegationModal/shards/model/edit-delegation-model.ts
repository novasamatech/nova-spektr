import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import { type DelegateAccount, delegationService } from '@/shared/api/governance';
import {
  type MultisigTxWrapper,
  type ProxyTxWrapper,
  type Transaction,
  type TxWrapper,
  WrapperKind,
} from '@/shared/core';
import {
  Step,
  formatAmount,
  getBalanceBn,
  getRelaychainAsset,
  isStep,
  nonNullable,
  nullable,
  transferableAmount,
} from '@/shared/lib/utils';
import { type AnyAccount, multisigOperationService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { votingModel } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import {
  delegateRegistryAggregate,
  delegationAggregate,
  networkSelectorModel,
  tracksAggregate,
  votingAggregate,
} from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type EditDelegationConfirm,
  editDelegationConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm';
import { type DelegateData, type FeeData } from '../lib/types';

import { formModel } from './form-model';
import { selectTracksModel } from './select-tracks-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<{ delegate: DelegateAccount; accounts: AnyAccount[] }>();
const flowFinished = createEvent();
const txSaved = createEvent();
const txsConfirmed = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $walletData = combine({
  wallet: walletSelect.$selectedWallet,
  accounts: walletSelect.$selectedAccounts,
  chain: networkSelectorModel.$governanceChain,
});

const $target = createStore<DelegateAccount | null>(null).reset(flowFinished);
const $tracks = createStore<number[]>([]).reset(flowFinished);
const $delegateData = createStore<Omit<DelegateData, 'tracks' | 'target' | 'shards'> | null>(null).reset(flowFinished);
const $accounts = createStore<AnyAccount[]>([]).reset(flowFinished);
const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });
const $isUnchanged = createStore(false);

const $txWrappers = createStore<TxWrapper[]>([]).reset(flowFinished);
const $coreTxs = createStore<Transaction[]>([]).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

const $activeDelegations = combine(
  { delegations: delegationAggregate.$activeDelegations, delegate: $target },
  ({ delegations, delegate }) => {
    if (!delegate) return {};

    return delegations[delegate.accountId] || {};
  },
);

type FeeParams = {
  api: ApiPromise;
  transaction: Transaction;
};
const getTransactionFeeFx = createEffect(({ api, transaction }: FeeParams): Promise<string> => {
  return transactionService.getTransactionFee(transaction, api);
});

type DepositParams = {
  api: ApiPromise;
  threshold: number;
};
const getMultisigDepositFx = createEffect(({ api, threshold }: DepositParams): string => {
  return transactionService.getMultisigDeposit(threshold, api);
});

const $api = combine(
  {
    apis: networkModel.$apis,
    walletData: $walletData,
  },
  ({ apis, walletData }) => {
    if (!walletData.chain) return null;

    return apis[walletData.chain.chainId] ?? null;
  },
);

const $transactions = combine(
  {
    api: $api,
    coreTxs: $coreTxs,
    txWrappers: $txWrappers,
  },
  ({ api, coreTxs, txWrappers }) => {
    if (!api) return null;

    return coreTxs.map((tx) =>
      transactionService.getWrappedTransaction({
        api,
        transaction: tx,
        txWrappers,
      }),
    );
  },
);

// Transaction & Form

sample({
  clock: formModel.output.formChanged,
  source: {
    walletData: $walletData,
    wallets: walletModel.$wallets,
  },
  filter: ({ walletData }) => Boolean(walletData.wallet),
  fn: ({ walletData, wallets }, data) => {
    const signatories = 'signatory' in data && data.signatory ? [data.signatory] : [];

    return transactionService.getTxWrappers({
      wallet: walletData.wallet!,
      wallets,
      account: walletData.wallet!.accounts[0]!,
      signatories,
    });
  },
  target: $txWrappers,
});

sample({
  clock: formModel.output.formChanged,
  fn: (formParams) => {
    return {
      signatory: formParams.signatory,
      balance: formParams.amount,
      conviction: formParams.conviction,
      locks: formParams.locks,
    };
  },
  target: $delegateData,
});

sample({
  clock: formModel.output.formChanged,
  fn: ({ isUnchanged }) => isUnchanged,
  target: $isUnchanged,
});

sample({
  clock: $txWrappers.updates,
  fn: (txWrappers) => {
    const signatories = txWrappers.reduce<AnyAccount[][]>((acc, wrapper) => {
      if (wrapper.kind === WrapperKind.MULTISIG) acc.push(wrapper.signatories);

      return acc;
    }, []);

    const proxyWrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      signatories,
      proxyAccount: proxyWrapper?.proxyAccount || null,
      isProxy: transactionService.hasProxy(txWrappers),
      isMultisig: transactionService.hasMultisig(txWrappers),
    };
  },
  target: formModel.events.txWrapperChanged,
});

sample({
  clock: formModel.output.formChanged,
  source: {
    walletData: $walletData,
    target: $target,
    tracks: $tracks,
    accounts: $accounts,
    activeTracks: delegationAggregate.$activeTracks,
    activeDelegations: $activeDelegations,
  },
  filter: ({ walletData, target, tracks }) => {
    return Boolean(walletData.chain) && Boolean(target) && Boolean(tracks.length);
  },
  fn: ({ walletData, accounts, target, tracks, activeTracks, activeDelegations }, delegateData) => {
    if (nullable(target)) return [];

    return accounts.map((shard) => {
      const conviction = delegateData!.isUnchanged
        ? activeDelegations[shard.accountId]?.conviction
        : delegateData!.conviction;
      const amount = delegateData!.isUnchanged
        ? activeDelegations[shard.accountId]?.balance.toString()
        : walletData.chain && formatAmount(delegateData!.amount, walletData.chain?.assets[0]!.precision);

      return transactionBuilder.buildEditDelegation({
        chain: walletData.chain!,
        accountId: shard.accountId,
        balance: amount || '0',
        conviction: conviction || 'None',
        previousConviction: activeDelegations[shard.accountId]?.conviction || 'None',
        target: target.accountId,
        tracks,
        undelegateTracks: activeTracks[target!.accountId]?.[shard.accountId]?.map(Number) || [],
      });
    });
  },
  target: $coreTxs,
});

sample({
  clock: $transactions,
  source: $api,
  filter: (api, transactions) => Boolean(api) && Boolean(transactions?.length),
  fn: (api, transactions) => ({
    api: api!,
    transaction: transactions![0]!.wrappedTx,
  }),
  target: getTransactionFeeFx,
});

sample({
  clock: $txWrappers,
  source: $api,
  filter: (api, txWrappers) => Boolean(api) && transactionService.hasMultisig(txWrappers),
  fn: (api, txWrappers) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.MULTISIG) as MultisigTxWrapper;

    return {
      api: api!,
      threshold: wrapper?.multisigAccount.threshold || 0,
    };
  },
  target: getMultisigDepositFx,
});

sample({
  clock: getTransactionFeeFx.pending,
  target: formModel.events.isFeeLoadingChanged,
});

sample({
  clock: getTransactionFeeFx.doneData,
  source: {
    transactions: $transactions,
    feeData: $feeData,
  },
  fn: ({ transactions, feeData }, fee) => {
    const totalFee = new BN(fee).muln(transactions!.length).toString();

    return { ...feeData, fee, totalFee };
  },
  target: $feeData,
});

sample({
  clock: getMultisigDepositFx.doneData,
  source: $feeData,
  fn: (feeData, multisigDeposit) => ({ ...feeData, multisigDeposit }),
  target: $feeData,
});

sample({
  clock: $feeData.updates,
  target: formModel.events.feeDataChanged,
});

// Steps

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  target: spread({
    delegate: $target,
    accounts: $accounts,
  }),
});

sample({
  clock: flowStarted,
  target: selectTracksModel.events.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.SELECT_TRACK,
  target: stepChanged,
});

sample({
  clock: selectTracksModel.output.formSubmitted,
  source: {
    walletData: $walletData,
    activeDelegations: $activeDelegations,
  },
  filter: ({ walletData }) => Boolean(walletData.chain) && Boolean(walletData.wallet),
  fn: ({ walletData, activeDelegations }, { tracks, accounts }) => ({
    event: { wallet: walletData.wallet!, chain: walletData.chain!, shards: accounts, activeDelegations },
    tracks,
    accounts,
    step: Step.INIT,
  }),
  target: spread({
    event: formModel.events.formInitiated,
    tracks: $tracks,
    accounts: $accounts,
    step: stepChanged,
  }),
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    balances: balanceModel.$balanceMap,
    feeData: $feeData,
    walletData: $walletData,
    tracks: $tracks,
    shards: $accounts,
    target: $target,
    accounts: $accounts,
    txWrappers: $txWrappers,
    delegateData: $delegateData,
    activeDelegations: $activeDelegations,
    isUnchanged: $isUnchanged,
    coreTxs: $coreTxs,
    step: $step,
    transactions: $transactions,
  },
  filter: ({ walletData, delegateData, step }) =>
    Boolean(delegateData) && Boolean(walletData.wallet) && Boolean(walletData.chain) && isStep(step, Step.INIT),
  fn: ({
    feeData,
    balances,
    walletData,
    txWrappers,
    tracks,
    target,
    shards,
    delegateData,
    coreTxs,
    activeDelegations,
    isUnchanged,
    transactions,
  }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;
    const asset = getRelaychainAsset(walletData.chain!.assets)!;
    const events = shards
      .map((shard, index) => {
        if (nullable(target?.accountId)) {
          return null;
        }

        const coreTx = coreTxs[index]!;
        const transaction = transactions![index]!;

        return {
          chain: walletData.chain!,
          asset: asset!,
          tracks,
          target: target.accountId,
          transferable: transferableAmount(
            balanceUtils.getBalance(balances, shard.accountId, walletData.chain!.chainId, asset.assetId),
          ),
          ...delegateData!,
          signatory: delegateData!.signatory!,
          ...(isUnchanged && {
            balance: getBalanceBn(
              activeDelegations[shard.accountId]?.balance.toString() ?? '0',
              asset.precision,
            ).toString(),
            conviction: activeDelegations[shard.accountId]?.conviction,
          }),
          previousConviction: activeDelegations[shard.accountId]?.conviction ?? 'None',
          ...feeData,
          ...(wrapper && { proxiedAccount: wrapper.proxiedAccount }),
          ...(wrapper ? { shards: [wrapper.proxyAccount] } : { shards: [shard] }),
          locks: delegateData!.locks[shard.accountId] ?? BN_ZERO,
          coreTx,
          route: [shard],
          tx: transaction.wrappedTx,
          initiator: shard,
        } satisfies EditDelegationConfirm;
      })
      .filter(nonNullable);

    return {
      events: events,
      step: Step.CONFIRM,
    };
  },
  target: spread({
    events: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: [confirmModel.startSigning, txsConfirmed],
  source: {
    delegateData: $delegateData,
    walletData: $walletData,
    transactions: $transactions,
    txWrappers: $txWrappers,
    accounts: $accounts,
    step: $step,
  },
  filter: ({ delegateData, walletData, transactions, step }) => {
    return Boolean(delegateData) && Boolean(walletData) && Boolean(transactions) && isStep(step, Step.CONFIRM);
  },
  fn: ({ delegateData, walletData, transactions, txWrappers, accounts }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        signingPayloads:
          transactions?.map((tx, index) => ({
            chain: walletData.chain!,
            account: wrapper ? wrapper.proxyAccount : accounts[index]!,
            signatory: delegateData!.signatory,
            transaction: tx.wrappedTx,
          })) || [],
      },
      step: Step.SIGN,
    };
  },
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.output.formSubmitted,
  source: {
    walletData: $walletData,
    transactions: $transactions,
    delegateData: $delegateData,
    accounts: $accounts,
    step: $step,
  },
  filter: ({ delegateData, walletData, transactions, accounts, step }) => {
    return (
      Boolean(delegateData) &&
      Boolean(walletData) &&
      Boolean(transactions) &&
      accounts.length > 0 &&
      isStep(step, Step.SIGN)
    );
  },
  fn: (delegateFlowData, signParams) => ({
    event: {
      ...signParams,
      chain: delegateFlowData.walletData.chain!,
      account: delegateFlowData.accounts[0]!,
      signatory: delegateFlowData.delegateData!.signatory,
      coreTxs: delegateFlowData.transactions!.map((tx) => tx.coreTx),
      wrappedTxs: delegateFlowData.transactions!.map((tx) => tx.wrappedTx),
    },
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { delegate: $target, data: $delegateData, walletData: $walletData, tracks: $tracks },
  filter: ({ delegate, data, walletData }) => {
    return !!delegate && !!data && !!walletData.chain;
  },
  fn: ({ delegate, tracks, data, walletData }) => ({
    delegate: delegate!,
    votes: delegationService.calculateTotalVotes(new BN(data!.balance), tracks, walletData.chain!),
  }),
  target: delegateRegistryAggregate.events.addDelegation,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { network: networkSelectorModel.$network, delegateData: $delegateData },
  filter: ({ network, delegateData }) => nonNullable(network) && nonNullable(delegateData),
  fn: ({ network }) => ({ api: network!.api, chain: network!.chain }),
  target: tracksAggregate.events.requestTracks,
});

// TODO: On edit delegations we receive wrong data on this subscription. Need to resubscribe.
sample({
  clock: signModel.output.formSubmitted,
  target: votingModel.events.unsubscribeVoting,
});

sample({
  clock: combineEvents({
    events: [submitModel.output.formSubmitted, votingModel.events.unsubscribeVoting],
    reset: flowStarted,
  }),
  source: {
    network: networkSelectorModel.$network,
    wallet: walletSelect.$selectedWallet,
  },
  filter: ({ network, wallet }) => nonNullable(network) && nonNullable(wallet),
  fn: ({ network, wallet }) => ({
    api: network!.api,
    accounts: accountUtils.getAccountsIdsForWallet(wallet!, network!.chain),
    chain: network!.chain,
  }),
  target: votingAggregate.events.requestVoting,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { isMultisig: formModel.$isMultisig, coreTx: $coreTxs, wrappedTx: $transactions },
  filter: ({ isMultisig }, results) => isMultisig && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ coreTx, wrappedTx }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx[0]!.chainId,
      callHash: wrappedTx![0]!.wrappedTx.args.callHash,
      multisigAccountId: coreTx[0]!.accountId,
      blockCreated: timepoint.height,
      indexCreated: timepoint.index,
    });
  },
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

sample({
  clock: txSaved,
  source: $coreTxs,
  fn: (coreTxs) => {
    return coreTxs.map((coreTx) => ({
      initiatorAccountId: coreTx.accountId,
      coreTx,
      route: [],
      createdAt: Date.now(),
    }));
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const editDelegationModel = {
  $step,
  $walletData,
  $initiatorWallet: $walletData.map((data) => data?.wallet || null),
  $transactions,

  events: {
    flowStarted,
    stepChanged,
    txSaved,
    txsConfirmed,
  },
  output: {
    flowFinished,
  },
};
