import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
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
import { Step, formatAmount, getRelaychainAsset, isStep, nonNullable, transferableAmount } from '@/shared/lib/utils';
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
  networkSelectorModel,
  tracksAggregate,
  votingAggregate,
} from '@/features/governance';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { delegateConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm/Delegate';
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
  wallet: walletSelect.$selectedWallet,
  accounts: walletSelect.$selectedAccounts,
  chain: networkSelectorModel.$governanceChain,
});

const $target = createStore<DelegateAccount | null>(null).reset(flowFinished);
const $tracks = createStore<number[]>([]).reset(flowFinished);
const $delegateData = createStore<Omit<DelegateData, 'tracks' | 'target' | 'initiator'> | null>(null).reset(
  flowFinished,
);

const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });

const $txWrappers = createStore<TxWrapper[]>([]).reset(flowFinished);
const $coreTx = combine(
  {
    walletData: $walletData,
    target: $target,
    tracks: $tracks,
    initiator: formModel.form.fields.initiator.$value,
    delegateData: $delegateData,
  },
  ({ walletData, target, tracks, initiator, delegateData }) => {
    if (!walletData.chain || !target || tracks.length === 0 || !initiator || !delegateData) return null;

    return transactionBuilder.buildDelegate({
      chain: walletData.chain,
      accountId: initiator.accountId,
      balance: (walletData.chain && formatAmount(delegateData.balance, walletData.chain.assets[0].precision)) || '0',
      conviction: delegateData.conviction || 'None',
      target: target.address || '',
      tracks,
    });
  },
);

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
    return walletData?.chain ? apis[walletData.chain.chainId] : null;
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
  source: $feeData,
  fn: (feeData, fee) => {
    return { ...feeData, fee, totalFee: fee };
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
  filter: (walletData) => nonNullable(walletData.chain) && nonNullable(walletData.wallet),
  fn: (walletData, { tracks, accounts }) => ({
    event: { wallet: walletData.wallet!, chain: walletData.chain!, shards: accounts },
    tracks,
    step: Step.INIT,
  }),
  target: spread({
    event: formModel.events.formInitiated,
    tracks: $tracks,
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
    initiator: formModel.form.fields.initiator.$value,
    target: $target,
    txWrappers: $txWrappers,
    delegateData: $delegateData,
    coreTx: $coreTx,
    step: $step,
  },
  filter: ({ walletData, delegateData, initiator, step }) => {
    return (
      nonNullable(delegateData) &&
      nonNullable(walletData.wallet) &&
      nonNullable(walletData.chain) &&
      nonNullable(initiator) &&
      isStep(step, Step.INIT)
    );
  },
  fn: ({ feeData, balances, walletData, txWrappers, tracks, target, initiator, delegateData, coreTx }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;
    const asset = getRelaychainAsset(walletData.chain!.assets)!;

    return {
      event: [
        {
          chain: walletData.chain!,
          asset: asset!,
          tracks,
          target: target?.address || '',
          transferable: transferableAmount(
            balanceUtils.getBalance(
              balances,
              initiator!.accountId,
              walletData.chain!.chainId,
              asset.assetId.toString(),
            ),
          ),
          balance: delegateData!.balance,
          conviction: delegateData!.conviction,
          signatory: delegateData!.signatory,
          fee: feeData.fee,
          totalFee: feeData.totalFee,
          multisigDeposit: feeData.multisigDeposit,
          ...(wrapper && { proxiedAccount: wrapper.proxiedAccount }),
          shards: wrapper ? [wrapper.proxyAccount] : [initiator!],
          locks: delegateData!.locks[initiator!.accountId],
          coreTx: coreTx!,
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
    initiator: formModel.form.fields.initiator.$value,
    step: $step,
  },
  filter: ({ delegateData, walletData, transaction, step }) => {
    return (
      nonNullable(delegateData) && nonNullable(walletData) && nonNullable(transaction) && isStep(step, Step.CONFIRM)
    );
  },
  fn: ({ delegateData, walletData, transaction, txWrappers, initiator }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        signingPayloads: transaction
          ? [
              {
                chain: walletData.chain!,
                account: wrapper ? wrapper.proxyAccount : initiator!,
                signatory: delegateData!.signatory,
                transaction: transaction.wrappedTx,
              },
            ]
          : [],
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
    initiator: formModel.form.fields.initiator.$value,
    step: $step,
  },
  filter: ({ delegateData, walletData, transaction, step }) => {
    return nonNullable(delegateData) && nonNullable(walletData) && nonNullable(transaction) && isStep(step, Step.SIGN);
  },
  fn: (delegateFlowData, signParams) => ({
    event: {
      ...signParams,
      chain: delegateFlowData.walletData.chain!,
      account: delegateFlowData.initiator!,
      signatory: delegateFlowData.delegateData!.signatory,
      coreTxs: delegateFlowData.transaction ? [delegateFlowData.transaction.coreTx] : [],
      wrappedTxs: delegateFlowData.transaction ? [delegateFlowData.transaction.wrappedTx] : [],
      multisigTxs:
        delegateFlowData.transaction && delegateFlowData.transaction.multisigTx
          ? [delegateFlowData.transaction.multisigTx]
          : [],
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

export const delegateModel = {
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
