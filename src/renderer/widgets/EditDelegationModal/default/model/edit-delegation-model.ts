import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import { type DelegateAccount, delegationService } from '@/shared/api/governance';
import {
  type Account,
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
  toAddress,
  transferableAmount,
} from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { type AnyAccount, accountService } from '@/domains/network';
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
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { editDelegationConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type DelegateData, type FeeData } from '../lib/types';

import { formModel } from './form-model';
import { selectTracksModel } from './select-tracks-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<{ delegate: DelegateAccount; accounts: Account[] }>();
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
const $delegateData = createStore<Omit<DelegateData, 'tracks' | 'target' | 'initiator'> | null>(null).reset(
  flowFinished,
);
const $accounts = createStore<Account[]>([]).reset(flowFinished);
const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });
const $isUnchanged = createStore(false);

const $txWrappers = createStore<TxWrapper[]>([]).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $activeDelegations = combine(
  { delegations: delegationAggregate.$activeDelegations, delegate: $target },
  ({ delegations, delegate }) => {
    if (!delegate) return {};

    return delegations[delegate.address] || {};
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

    return apis[walletData.chain.chainId] || null;
  },
);

const $transaction = combine(
  {
    api: $api,
    coreTx: $coreTx,
    txWrappers: $txWrappers,
  },
  ({ api, coreTx, txWrappers }) => {
    if (!api || !coreTx) return null;

    return transactionService.getWrappedTransaction({
      api,
      transaction: coreTx,
      txWrappers,
    });
  },
);

// Transaction & Form

sample({
  clock: formModel.output.formChanged,
  source: {
    walletData: $walletData,
    wallets: walletModel.$wallets,
  },
  filter: ({ walletData }) => nonNullable(walletData.wallet),
  fn: ({ walletData, wallets }, data) => {
    const signatories = 'signatory' in data && data.signatory ? [data.signatory] : [];

    return transactionService.getTxWrappers({
      wallet: walletData.wallet!,
      wallets,
      account: walletData.wallet!.accounts[0],
      signatories,
    });
  },
  target: $txWrappers,
});

sample({
  clock: formModel.output.formChanged,
  source: {
    walletData: $walletData,
    target: $target,
    tracks: $tracks,
    account: formModel.$account,
    activeTracks: delegationAggregate.$activeTracks,
    activeDelegations: $activeDelegations,
  },
  filter: ({ walletData, target, tracks, account }) => {
    return nonNullable(walletData.chain) && nonNullable(target) && nonNullable(tracks.length) && nonNullable(account);
  },
  fn: ({ walletData, account, target, tracks, activeTracks, activeDelegations }, delegateData) => {
    const shard = account!.account;
    const address = toAddress(shard.accountId, { prefix: walletData.chain!.addressPrefix });
    const conviction = delegateData!.isUnchanged ? activeDelegations[address].conviction : delegateData!.conviction;
    const amount = delegateData!.isUnchanged
      ? activeDelegations[address].balance.toString()
      : walletData.chain && formatAmount(delegateData!.amount, walletData.chain?.assets[0].precision);

    return transactionBuilder.buildEditDelegation({
      chain: walletData.chain!,
      accountId: shard.accountId,
      balance: amount || '0',
      conviction: conviction || 'None',
      previousConviction: activeDelegations[address].conviction || 'None',
      target: target?.address || '',
      tracks,
      undelegateTracks:
        activeTracks[target!.address]?.[toAddress(shard.accountId, { prefix: walletData.chain!.addressPrefix })].map(
          Number,
        ) || [],
    });
  },
  target: $coreTx,
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
  clock: $transaction,
  source: $api,
  filter: (api, transaction) => nonNullable(api) && nonNullable(transaction),
  fn: (api, transaction) => ({
    api: api!,
    transaction: transaction!.wrappedTx,
  }),
  target: getTransactionFeeFx,
});

sample({
  clock: $txWrappers,
  source: $api,
  filter: (api, txWrappers) => nonNullable(api) && transactionService.hasMultisig(txWrappers),
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
    feeData: $feeData,
  },
  fn: ({ feeData }, fee) => {
    const totalFee = new BN(fee).muln(1).toString();

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
  filter: ({ walletData }) => nonNullable(walletData.chain) && nonNullable(walletData.wallet),
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
    balances: balanceModel.$balances,
    feeData: $feeData,
    walletData: $walletData,
    tracks: $tracks,
    target: $target,
    account: formModel.$account,
    txWrappers: $txWrappers,
    delegateData: $delegateData,
    activeDelegations: $activeDelegations,
    isUnchanged: $isUnchanged,
    coreTx: $coreTx,
    step: $step,
  },
  filter: ({ walletData, delegateData, step, account }) =>
    nonNullable(delegateData) &&
    nonNullable(walletData.wallet) &&
    nonNullable(walletData.chain) &&
    nonNullable(account) &&
    isStep(step, Step.INIT),
  fn: ({
    feeData,
    balances,
    walletData,
    txWrappers,
    tracks,
    target,
    account,
    delegateData,
    coreTx,
    activeDelegations,
    isUnchanged,
  }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;
    const asset = getRelaychainAsset(walletData.chain!.assets)!;
    const shard = account!.account;

    const address = toAddress(shard.accountId, { prefix: walletData.chain!.addressPrefix });

    return {
      event: [
        {
          chain: walletData.chain!,
          asset: asset!,
          tracks,
          target: target?.address || '',
          transferable: transferableAmount(
            balanceUtils.getBalance(balances, shard.accountId, walletData.chain!.chainId, asset.assetId.toString()),
          ),
          ...delegateData!,
          ...(isUnchanged && {
            balance: getBalanceBn(activeDelegations[address].balance.toString(), asset.precision).toString(),
            conviction: activeDelegations[address].conviction,
          }),
          previousConviction: activeDelegations[address].conviction,
          ...feeData,
          ...(wrapper && { proxiedAccount: wrapper.proxiedAccount }),
          ...(wrapper ? { shards: [wrapper.proxyAccount] } : { shards: [shard] }),
          locks: delegateData!.locks[shard.accountId],
          coreTx,
        },
      ],
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: [confirmModel.output.formSubmitted, txsConfirmed],
  source: {
    delegateData: $delegateData,
    walletData: $walletData,
    transaction: $transaction,
    txWrappers: $txWrappers,
    account: formModel.$account,
    step: $step,
  },
  filter: ({ delegateData, walletData, transaction, step, account }) => {
    return (
      nonNullable(delegateData) &&
      nonNullable(walletData) &&
      nonNullable(transaction) &&
      nonNullable(account) &&
      isStep(step, Step.CONFIRM)
    );
  },
  fn: ({ delegateData, walletData, transaction, txWrappers, account }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        signingPayloads: [
          {
            chain: walletData.chain!,
            account: wrapper ? wrapper.proxyAccount : account!.account,
            signatory: delegateData!.signatory,
            transaction: transaction!.wrappedTx,
          },
        ],
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
    transaction: $transaction,
    delegateData: $delegateData,
    accounts: $accounts,
    step: $step,
  },
  filter: ({ delegateData, walletData, transaction, step }) => {
    return nonNullable(delegateData) && nonNullable(walletData) && nonNullable(transaction) && isStep(step, Step.SIGN);
  },
  fn: (delegateFlowData, signParams) => ({
    event: {
      ...signParams,
      chain: delegateFlowData.walletData.chain!,
      account: delegateFlowData.accounts[0],
      signatory: delegateFlowData.delegateData!.signatory,
      coreTxs: [delegateFlowData.transaction!.coreTx],
      wrappedTxs: [delegateFlowData.transaction!.wrappedTx],
      multisigTxs: delegateFlowData.transaction!.multisigTx ? [delegateFlowData.transaction!.multisigTx] : [],
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
  source: formModel.$isMultisig,
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0].result),
  fn: () => Paths.OPERATIONS,
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
  source: {
    walletData: $walletData,
    coreTx: $coreTx,
    txWrappers: $txWrappers,
  },
  filter: ({ walletData, coreTx, txWrappers }) => {
    return nonNullable(walletData.wallet) && nonNullable(coreTx) && nonNullable(txWrappers);
  },
  fn: ({ walletData, coreTx, txWrappers }) => {
    const accounts = walletData.chain
      ? accountService.filterAccountsOnChain(walletData.accounts, walletData.chain)
      : [];
    const account = accounts.at(0);
    if (!account) throw new Error('Account not found');

    return [
      {
        initiatorAccountId: account.accountId,
        coreTx: coreTx!,
        txWrappers,
        createdAt: Date.now(),
      },
    ];
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
  $transactions: $transaction,

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
