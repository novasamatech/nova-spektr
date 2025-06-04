import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import {
  type MultisigTxWrapper,
  type ProxyTxWrapper,
  type Transaction,
  type TxWrapper,
  WrapperKind,
} from '@/shared/core';
import { getRelaychainAsset, nonNullable } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { bondExtraConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { bondExtraUtils } from '../lib/bond-extra-utils';
import { type BondExtraData, type FeeData, Step, type WalletDataShards } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<WalletDataShards>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $walletDataShards = restore<WalletDataShards | null>(flowStarted, null).reset(flowFinished);
const $walletData = $walletDataShards.map((data) => {
  if (!data) return null;

  return {
    initiator: data.shards[0],
    chain: data.chain,
    wallet: data.wallet,
  };
});

const $bondExtraData = createStore<BondExtraData | null>(null).reset(flowFinished);
const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $txWrappers = createStore<TxWrapper[]>([]).reset(flowFinished);
const $pureTx = createStore<Transaction | null>(null).reset(flowFinished);

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
    return walletData ? apis[walletData.chain.chainId] : undefined;
  },
  { skipVoid: false },
);

const $transaction = combine(
  {
    api: $api,
    pureTx: $pureTx,
    txWrappers: $txWrappers,
  },
  ({ api, pureTx, txWrappers }) => {
    if (!api || !pureTx) return undefined;

    return transactionService.getWrappedTransaction({
      api,
      transaction: pureTx,
      txWrappers,
    });
  },
  { skipVoid: false },
);

// Transaction & Form

sample({
  clock: [flowStarted, formModel.output.formChanged],
  source: {
    walletData: $walletData,
    wallets: walletModel.$wallets,
  },
  filter: ({ walletData }) => nonNullable(walletData) && nonNullable(walletData?.initiator),
  fn: ({ walletData, wallets }, data) => {
    const signatories = 'signatory' in data && data.signatory ? [data.signatory] : [];

    return bondExtraUtils.getTxWrappers({
      chain: walletData!.chain,
      wallet: walletData!.wallet,
      wallets,
      account: walletData!.initiator!,
      signatories,
    });
  },
  target: $txWrappers,
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
  source: $feeData,
  fn: (feeData, formParams) => ({
    ...feeData,
    ...formParams,
  }),
  target: $bondExtraData,
});

sample({
  clock: $bondExtraData.updates,
  source: $walletData,
  filter: (walletData, bondExtraData) =>
    nonNullable(walletData) && nonNullable(bondExtraData) && nonNullable(bondExtraData?.initiator),
  fn: (walletData, bondExtraData) => {
    if (!bondExtraData || !bondExtraData.initiator) return null;

    return transactionBuilder.buildBondExtra({
      chain: walletData!.chain,
      asset: walletData!.chain.assets[0],
      accountId: bondExtraData.initiator.accountId,
      amount: bondExtraData.amount,
    });
  },
  target: $pureTx,
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
    const totalFee = fee; // Single transaction now, so total fee equals fee

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
  fn: (data) => ({
    initiator: data.shards[0],
    chain: data.chain,
    wallet: data.wallet,
  }),
  target: formModel.events.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    bondData: $bondExtraData,
    feeData: $feeData,
    walletData: $walletData,
    txWrappers: $txWrappers,
    coreTx: $pureTx,
  },
  filter: ({ bondData, walletData }) =>
    nonNullable(bondData) && nonNullable(walletData) && nonNullable(bondData?.initiator),
  fn: ({ bondData, feeData, walletData, txWrappers, coreTx }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: [
        {
          ...bondData!,
          ...feeData,
          ...(wrapper && { proxiedAccount: wrapper.proxiedAccount }),
          chain: walletData!.chain,
          asset: getRelaychainAsset(walletData!.chain.assets)!,
          shards: [bondData!.initiator!],
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
  clock: confirmModel.output.formSubmitted,
  source: {
    bondData: $bondExtraData,
    walletData: $walletData,
    transactions: $transaction,
    txWrappers: $txWrappers,
  },
  filter: ({ bondData, walletData, transactions }) => {
    return (
      nonNullable(bondData) && nonNullable(walletData) && nonNullable(transactions) && nonNullable(bondData?.initiator)
    );
  },
  fn: ({ bondData, walletData, transactions, txWrappers }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        signingPayloads: [
          {
            chain: walletData!.chain,
            account: wrapper ? wrapper.proxyAccount : bondData!.initiator!,
            signatory: bondData!.signatory,
            transaction: transactions!.wrappedTx,
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
    bondData: $bondExtraData,
    walletData: $walletData,
    transactions: $transaction,
  },
  filter: ({ bondData, walletData, transactions }) => {
    return (
      nonNullable(bondData) &&
      nonNullable(walletData) &&
      nonNullable(transactions) &&
      nonNullable(bondData?.initiator) &&
      nonNullable(bondData?.signatory) &&
      nonNullable(transactions?.coreTx) &&
      nonNullable(transactions?.wrappedTx) &&
      nonNullable(transactions?.multisigTx)
    );
  },
  fn: (bondFlowData, signParams) => {
    return {
      event: {
        ...signParams,
        chain: bondFlowData.walletData!.chain,
        account: bondFlowData.bondData!.initiator!,
        signatory: bondFlowData.bondData!.signatory!,
        coreTxs: [bondFlowData.transactions!.coreTx],
        wrappedTxs: [bondFlowData.transactions!.wrappedTx],
        multisigTxs: [bondFlowData.transactions!.multisigTx!],
      },
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
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
    store: $walletData,
    coreTx: $pureTx,
    txWrappers: $txWrappers,
  },
  filter: ({ store, coreTx, txWrappers }) => {
    return nonNullable(store) && nonNullable(coreTx) && nonNullable(txWrappers) && nonNullable(store?.initiator);
  },
  fn: ({ store, coreTx, txWrappers }) => {
    if (!store || !coreTx || !store.initiator) return [];

    return [{ initiatorAccountId: store.initiator!.accountId, coreTx, txWrappers, createdAt: Date.now() }];
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const bondExtraModel = {
  $step,
  $walletData,
  $initiatorWallet: $walletData.map((data) => data?.wallet || null),

  events: {
    flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
