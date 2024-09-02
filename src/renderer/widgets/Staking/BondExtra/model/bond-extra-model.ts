import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type PathType, Paths } from '@/shared/routes';
import {
  type Account,
  type BasketTransaction,
  type MultisigTxWrapper,
  type ProxyTxWrapper,
  type Transaction,
  type TxWrapper,
  WrapperKind,
} from '@shared/core';
import { getRelaychainAsset, nonNullable } from '@shared/lib/utils';
import { basketModel } from '@entities/basket/model/basket-model';
import { networkModel } from '@entities/network';
import { transactionBuilder, transactionService } from '@entities/transaction';
import { walletModel } from '@entities/wallet';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@features/operations/OperationSubmit';
import { bondExtraConfirmModel as confirmModel } from '@features/operations/OperationsConfirm';
import { bondExtraUtils } from '../lib/bond-extra-utils';
import { type BondExtraData, type FeeData, Step, type WalletData } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<WalletData>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $walletData = restore<WalletData | null>(flowStarted, null).reset(flowFinished);
const $bondExtraData = createStore<BondExtraData | null>(null).reset(flowFinished);
const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $txWrappers = createStore<TxWrapper[]>([]).reset(flowFinished);
const $pureTxs = createStore<Transaction[]>([]).reset(flowFinished);

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

const $transactions = combine(
  {
    api: $api,
    walletData: $walletData,
    pureTxs: $pureTxs,
    txWrappers: $txWrappers,
  },
  ({ api, walletData, pureTxs, txWrappers }) => {
    if (!api || !walletData) return undefined;

    return pureTxs.map((tx) =>
      transactionService.getWrappedTransaction({
        api,
        addressPrefix: walletData.chain.addressPrefix,
        transaction: tx,
        txWrappers,
      }),
    );
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
  filter: ({ walletData }) => Boolean(walletData),
  fn: ({ walletData, wallets }, data) => {
    const signatories = 'signatory' in data && data.signatory ? [data.signatory] : [];

    return bondExtraUtils.getTxWrappers({
      chain: walletData!.chain,
      wallet: walletData!.wallet,
      wallets,
      account: walletData!.shards[0],
      signatories,
    });
  },
  target: $txWrappers,
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
  filter: (walletData, bondExtraData) => Boolean(walletData) && Boolean(bondExtraData),
  fn: (walletData, bondExtraData) => {
    return bondExtraData!.shards.map((shard) => {
      return transactionBuilder.buildBondExtra({
        chain: walletData!.chain,
        asset: walletData!.chain.assets[0],
        accountId: shard.accountId,
        amount: bondExtraData!.amount,
      });
    });
  },
  target: $pureTxs,
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
  },
  filter: ({ bondData, walletData }) => Boolean(bondData) && Boolean(walletData),
  fn: ({ bondData, feeData, walletData, txWrappers }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: [
        {
          chain: walletData!.chain,
          asset: getRelaychainAsset(walletData!.chain.assets)!,
          ...bondData!,
          ...feeData,
          ...(wrapper && { proxiedAccount: wrapper.proxiedAccount }),
          ...(wrapper && { shards: [wrapper.proxyAccount] }),
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
    transactions: $transactions,
    txWrappers: $txWrappers,
  },
  filter: ({ bondData, walletData, transactions }) => {
    return Boolean(bondData) && Boolean(walletData) && Boolean(transactions);
  },
  fn: ({ bondData, walletData, transactions, txWrappers }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        signingPayloads:
          transactions?.map((tx, index) => ({
            chain: walletData!.chain,
            account: wrapper ? wrapper.proxyAccount : bondData!.shards[index],
            signatory: bondData!.signatory,
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
    bondData: $bondExtraData,
    walletData: $walletData,
    transactions: $transactions,
  },
  filter: ({ bondData, walletData, transactions }) => {
    return Boolean(bondData) && Boolean(walletData) && Boolean(transactions);
  },
  fn: (bondFlowData, signParams) => ({
    event: {
      ...signParams,
      chain: bondFlowData.walletData!.chain,
      account: bondFlowData.bondData!.shards[0],
      signatory: bondFlowData.bondData!.signatory,
      description: bondFlowData.bondData!.description,
      coreTxs: bondFlowData.transactions!.map((tx) => tx.coreTx),
      wrappedTxs: bondFlowData.transactions!.map((tx) => tx.wrappedTx),
      multisigTxs: bondFlowData.transactions!.map((tx) => tx.multisigTx).filter(nonNullable),
    },
    step: Step.SUBMIT,
  }),
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
    coreTxs: $pureTxs,
    txWrappers: $txWrappers,
  },
  filter: ({ store, coreTxs, txWrappers }) => {
    return Boolean(store) && Boolean(coreTxs) && Boolean(txWrappers);
  },
  fn: ({ store, coreTxs, txWrappers }) => {
    const txs = coreTxs!.map(
      (coreTx) =>
        ({
          initiatorWallet: store!.wallet.id,
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
