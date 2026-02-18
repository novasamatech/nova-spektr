import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import {
  type MultisigTxWrapper,
  type ProxyTxWrapper,
  type Transaction,
  type TxWrapper,
  WrapperKind,
} from '@/shared/core';
import { getRelaychainAsset, nonNullable, nullable, validateAddress } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { type PayeeConfirm, payeeConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { payeeUtils } from '../lib/payee-utils';
import { type FeeData, type PayeeData, type WalletData, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<WalletData>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $walletData = restore<WalletData | null>(flowStarted, null).reset(flowFinished);
const $payeeData = createStore<PayeeData | null>(null).reset(flowFinished);
const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });

const $txWrappers = createStore<TxWrapper[]>([]).reset(flowFinished);
const $pureTxs = createStore<Transaction[]>([]).reset(flowFinished);
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
    return walletData ? (apis[walletData.chain.chainId] ?? null) : null;
  },
  { skipVoid: false },
);

const $transactions = combine(
  {
    api: $api,
    pureTxs: $pureTxs,
    txWrappers: $txWrappers,
  },
  ({ api, pureTxs, txWrappers }) => {
    if (!api) return undefined;

    return pureTxs.map((tx) =>
      transactionService.getWrappedTransaction({
        api,
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

    return payeeUtils.getTxWrappers({
      chain: walletData!.chain,
      wallet: walletData!.wallet,
      wallets,
      account: walletData!.shards[0]!,
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
  target: $payeeData,
});

sample({
  clock: $payeeData.updates,
  source: $walletData,
  filter: (walletData, payeeData) => Boolean(walletData) && Boolean(payeeData),
  fn: (walletData, payeeData) => {
    if (nullable(payeeData) || nullable(walletData)) return [];

    const destination = payeeData.destination;
    if (!validateAddress(destination)) return [];

    return payeeData.shards.map((shard) => {
      return transactionBuilder.buildSetPayee({
        chain: walletData.chain,
        accountId: shard.accountId,
        destination,
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
    payeeData: $payeeData,
    feeData: $feeData,
    walletData: $walletData,
    txWrappers: $txWrappers,
    coreTxs: $pureTxs,
  },
  filter: ({ payeeData, walletData }) => Boolean(payeeData) && Boolean(walletData),
  fn: ({ payeeData, feeData, walletData, coreTxs }) => {
    return {
      event: payeeData!.shards.map((shard, index) => {
        return {
          ...payeeData!,
          ...feeData,
          chain: walletData!.chain,
          asset: getRelaychainAsset(walletData!.chain.assets)!,
          initiator: shard,
          signatory: shard,
          route: [shard],
          tx: coreTxs[index]!,
          coreTx: coreTxs[index]!,
        } satisfies PayeeConfirm;
      }),
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigning,
  source: {
    payeeData: $payeeData,
    walletData: $walletData,
    transactions: $transactions,
    txWrappers: $txWrappers,
  },
  filter: ({ payeeData, walletData, transactions }) => {
    return Boolean(payeeData) && Boolean(walletData) && Boolean(transactions);
  },
  fn: ({ payeeData, walletData, transactions, txWrappers }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        signingPayloads: transactions!.map((tx, index) => ({
          chain: walletData!.chain,
          account: wrapper ? wrapper.proxyAccount : payeeData!.shards[index]!,
          signatory: payeeData!.signatory,
          transaction: tx.wrappedTx,
        })),
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
    payeeData: $payeeData,
    walletData: $walletData,
    transactions: $transactions,
  },
  filter: ({ payeeData, walletData, transactions }) => {
    return Boolean(payeeData) && Boolean(walletData) && Boolean(transactions);
  },
  fn: (payeeFlowData, signParams) => ({
    event: {
      ...signParams,
      chain: payeeFlowData.walletData!.chain,
      account: payeeFlowData.payeeData!.shards[0]!,
      signatory: payeeFlowData.payeeData!.signatory,
      coreTxs: payeeFlowData.transactions!.map((tx) => tx.coreTx),
      wrappedTxs: payeeFlowData.transactions!.map((tx) => tx.wrappedTx),
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
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0]!.result),
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
  source: $pureTxs,
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

export const payeeModel = {
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
