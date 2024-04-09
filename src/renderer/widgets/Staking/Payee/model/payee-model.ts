import { createEvent, createStore, sample, restore, combine, createEffect } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { spread, delay } from 'patronum';
import { BN } from '@polkadot/util';

import { walletModel } from '@entities/wallet';
import { TEST_ADDRESS, getRelaychainAsset, nonNullable } from '@shared/lib/utils';
import { networkModel } from '@entities/network';
import { validatorsService } from '@entities/staking';
import { submitModel } from '@features/operations/OperationSubmit';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { Account } from '@shared/core';
import { Step, PayeeData, WalletData, FeeData } from '../lib/types';
import { payeeUtils } from '../lib/payee-utils';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import {
  TxWrapper,
  Transaction,
  transactionBuilder,
  transactionService,
  WrapperKind,
  MultisigTxWrapper,
  ProxyTxWrapper,
} from '@entities/transaction';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<WalletData>();
const flowFinished = createEvent();

const $step = createStore<Step>(Step.NONE);

const $walletData = restore<WalletData | null>(flowStarted, null);
const $payeeData = createStore<PayeeData | null>(null);
const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });

const $txWrappers = createStore<TxWrapper[]>([]);
const $pureTxs = createStore<Transaction[]>([]);

const $maxValidators = createStore<number>(0);

const getMaxValidatorsFx = createEffect((api: ApiPromise): number => {
  return validatorsService.getMaxValidators(api);
});

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
    if (!walletData) return undefined;

    return apis[walletData.chain.chainId];
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

// Max validators

sample({
  clock: $api.updates,
  source: $maxValidators,
  filter: (maxValidators, api) => !maxValidators && Boolean(api),
  fn: (_, api) => api!,
  target: getMaxValidatorsFx,
});

sample({
  clock: getMaxValidatorsFx.doneData,
  target: $maxValidators,
});

// Transaction & Form

sample({
  clock: [flowStarted, formModel.output.formChanged],
  source: {
    walletData: $walletData,
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
  },
  filter: ({ walletData }) => Boolean(walletData),
  fn: ({ walletData, wallets, accounts }, data) => {
    const signatories = 'signatory' in data && data.signatory ? [data.signatory] : [];

    return payeeUtils.getTxWrappers({
      chain: walletData!.chain,
      wallet: walletData!.wallet,
      wallets,
      account: walletData!.shards[0],
      accounts,
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
  source: $payeeData,
  filter: (rewardDestinationData, data) => Boolean(rewardDestinationData) || typeof data !== 'number',
  fn: (rewardDestinationData, data) => {
    if (typeof data === 'number') {
      return {
        ...(rewardDestinationData || ({} as PayeeData)),
        validators: Array(data).fill({ address: TEST_ADDRESS }),
      };
    }

    if (Array.isArray(data)) {
      return { ...rewardDestinationData!, validators: data! };
    }

    return { ...data! };
  },
  target: $payeeData,
});

sample({
  clock: $payeeData.updates,
  source: $walletData,
  filter: (walletData, rewardDestinationData) => Boolean(walletData) && Boolean(rewardDestinationData),
  fn: (walletData, rewardDestinationData) => {
    return rewardDestinationData!.shards.map((shard) => {
      return transactionBuilder.buildSetPayee({
        chain: walletData!.chain,
        accountId: shard.accountId,
        destination: rewardDestinationData!.destination,
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
  target: [formModel.events.isFeeLoadingChanged, confirmModel.events.isFeeLoadingChanged],
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
  target: [formModel.events.feeDataChanged, confirmModel.events.feeDataChanged],
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
    rewardDestinationData: $payeeData,
    feeData: $feeData,
    walletData: $walletData,
    txWrappers: $txWrappers,
  },
  filter: ({ rewardDestinationData, walletData }) => Boolean(rewardDestinationData) && Boolean(walletData),
  fn: ({ rewardDestinationData, feeData, walletData, txWrappers }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        chain: walletData!.chain,
        asset: getRelaychainAsset(walletData!.chain.assets)!,
        ...rewardDestinationData!,
        ...feeData,
        ...(wrapper && { proxiedAccount: wrapper.proxiedAccount }),
        ...(wrapper && { shards: [wrapper.proxyAccount] }),
      },
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
    rewardDestinationData: $payeeData,
    walletData: $walletData,
    transactions: $transactions,
    txWrappers: $txWrappers,
  },
  filter: ({ rewardDestinationData, walletData, transactions }) => {
    return Boolean(rewardDestinationData) && Boolean(walletData) && Boolean(transactions);
  },
  fn: ({ rewardDestinationData, walletData, transactions, txWrappers }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        chain: walletData!.chain,
        accounts: wrapper ? [wrapper.proxyAccount] : rewardDestinationData!.shards,
        signatory: rewardDestinationData!.signatory,
        transactions: transactions!.map((tx) => tx.wrappedTx),
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
    rewardDestinationData: $payeeData,
    walletData: $walletData,
    transactions: $transactions,
  },
  filter: ({ rewardDestinationData, walletData, transactions }) => {
    return Boolean(rewardDestinationData) && Boolean(walletData) && Boolean(transactions);
  },
  fn: (bondFlowData, signParams) => ({
    event: {
      ...signParams,
      chain: bondFlowData.walletData!.chain,
      account: bondFlowData.rewardDestinationData!.shards[0],
      signatory: bondFlowData.rewardDestinationData!.signatory,
      description: bondFlowData.rewardDestinationData!.description,
      transactions: bondFlowData.transactions!.map((tx) => tx.coreTx),
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
  clock: delay(submitModel.output.formSubmitted, 2000),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
});

export const payeeModel = {
  $step,
  $walletData,
  events: {
    flowStarted,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
