import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type DelegateAccount, delegationService } from '@/shared/api/governance';
import {
  type Account,
  type BasketTransaction,
  type MultisigTxWrapper,
  type ProxyTxWrapper,
  type Transaction,
  type TxWrapper,
  WrapperKind,
} from '@/shared/core';
import { Step, formatAmount, getRelaychainAsset, isStep, nonNullable, transferableAmount } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { basketModel } from '@/entities/basket';
import { votingService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { delegateRegistryAggregate, networkSelectorModel, tracksAggregate } from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { delegateConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type DelegateData, type FeeData } from '../lib/types';

import { formModel } from './form-model';
import { selectTracksModel } from './select-tracks-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<DelegateAccount>();
const flowFinished = createEvent();
const txSaved = createEvent();
const txsConfirmed = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $walletData = combine({
  wallet: walletModel.$activeWallet,
  chain: networkSelectorModel.$governanceChain,
});

const $target = createStore<DelegateAccount | null>(null).reset(flowFinished);
const $tracks = createStore<number[]>([]).reset(flowFinished);
const $delegateData = createStore<Omit<DelegateData, 'tracks' | 'target' | 'shards'> | null>(null).reset(flowFinished);
const $accounts = createStore<Account[]>([]).reset(flowFinished);
const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });

const $txWrappers = createStore<TxWrapper[]>([]).reset(flowFinished);
const $coreTxs = createStore<Transaction[]>([]).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

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
    return walletData?.chain ? apis[walletData.chain.chainId] : undefined;
  },
  { skipVoid: false },
);

const $transactions = combine(
  {
    api: $api,
    walletData: $walletData,
    coreTxs: $coreTxs,
    txWrappers: $txWrappers,
  },
  ({ api, walletData, coreTxs, txWrappers }) => {
    if (!api || !walletData.chain) return undefined;

    return coreTxs.map((tx) =>
      transactionService.getWrappedTransaction({
        api,
        addressPrefix: walletData.chain!.addressPrefix,
        transaction: tx,
        txWrappers,
      }),
    );
  },
  { skipVoid: false },
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
      account: walletData.wallet!.accounts[0],
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
  clock: $txWrappers.updates,
  fn: (txWrappers) => {
    const signatories = txWrappers.reduce<Account[][]>((acc, wrapper) => {
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
  },
  filter: ({ walletData, target, tracks }) => {
    return Boolean(walletData.chain) && Boolean(target) && Boolean(tracks.length);
  },
  fn: ({ walletData, accounts, target, tracks }, delegateData) => {
    return accounts.map((shard) => {
      return transactionBuilder.buildDelegate({
        chain: walletData.chain!,
        accountId: shard.accountId,
        balance: (walletData.chain && formatAmount(delegateData!.amount, walletData.chain?.assets[0].precision)) || '0',
        conviction: delegateData!.conviction || 'None',
        target: target?.accountId || '',
        tracks,
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
    transaction: transactions![0].wrappedTx,
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
  target: $target,
});

sample({
  clock: flowStarted,
  filter: (target) => !!target,
  target: selectTracksModel.events.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.SELECT_TRACK,
  target: stepChanged,
});

sample({
  clock: selectTracksModel.output.formSubmitted,
  source: $walletData,
  filter: (walletData) => Boolean(walletData.chain) && Boolean(walletData.wallet),
  fn: (walletData, { tracks, accounts }) => ({
    event: { wallet: walletData.wallet!, chain: walletData.chain!, shards: accounts },
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
    shards: $accounts,
    target: $target,
    accounts: $accounts,
    txWrappers: $txWrappers,
    delegateData: $delegateData,
    coreTxs: $coreTxs,
    step: $step,
  },
  filter: ({ walletData, delegateData, step }) => {
    return Boolean(delegateData) && Boolean(walletData.wallet) && Boolean(walletData.chain) && isStep(step, Step.INIT);
  },
  fn: ({ feeData, balances, walletData, txWrappers, tracks, target, shards, delegateData, coreTxs }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;
    const asset = getRelaychainAsset(walletData.chain!.assets)!;

    return {
      event: shards.map((shard, index) => {
        return {
          chain: walletData.chain!,
          asset: asset!,
          tracks,
          target: target?.accountId || '',
          transferable: transferableAmount(
            balanceUtils.getBalance(balances, shard.accountId, walletData.chain!.chainId, asset.assetId.toString()),
          ),
          ...delegateData!,
          ...feeData,
          ...(wrapper && { proxiedAccount: wrapper.proxiedAccount }),
          ...(wrapper ? { shards: [wrapper.proxyAccount] } : { shards: [shard] }),
          locks: delegateData!.locks[shard.accountId],
          coreTx: coreTxs[index],
        };
      }),
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
            account: wrapper ? wrapper.proxyAccount : accounts[index],
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
  filter: ({ delegateData, walletData, transactions, step }) => {
    return Boolean(delegateData) && Boolean(walletData) && Boolean(transactions) && isStep(step, Step.SIGN);
  },
  fn: (delegateFlowData, signParams) => ({
    event: {
      ...signParams,
      chain: delegateFlowData.walletData.chain!,
      account: delegateFlowData.accounts[0],
      signatory: delegateFlowData.delegateData!.signatory,
      coreTxs: delegateFlowData.transactions!.map((tx) => tx.coreTx),
      wrappedTxs: delegateFlowData.transactions!.map((tx) => tx.wrappedTx),
      multisigTxs: delegateFlowData.transactions!.map((tx) => tx.multisigTx).filter(nonNullable),
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
  fn: ({ delegate, tracks, data, walletData }) => {
    return {
      delegate: delegate!,
      votes: delegationService.calculateTotalVotes(
        votingService.calculateVotingPower(new BN(data!.balance), data!.conviction),
        tracks,
        walletData.chain!,
      ),
    };
  },
  target: delegateRegistryAggregate.events.addDelegation,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { network: networkSelectorModel.$network, delegateData: $delegateData },
  filter: ({ network, delegateData }) => nonNullable(network) && nonNullable(delegateData),
  fn: ({ network }) => ({ api: network!.api, chain: network!.chain }),
  target: tracksAggregate.events.requestTracks,
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
    coreTxs: $coreTxs,
    txWrappers: $txWrappers,
  },
  filter: ({ walletData, coreTxs, txWrappers }) => {
    return Boolean(walletData.wallet) && Boolean(coreTxs) && Boolean(txWrappers);
  },
  fn: ({ walletData, coreTxs, txWrappers }) => {
    const txs = coreTxs!.map(
      (coreTx) =>
        ({
          initiatorWallet: walletData.wallet!.id,
          coreTx,
          txWrappers,
          groupId: Date.now(),
        }) as BasketTransaction,
    );

    return txs;
  },
  target: basketModel.events.transactionsCreated,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const delegateModel = {
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
