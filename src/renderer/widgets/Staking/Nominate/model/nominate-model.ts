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
import { validatorsModel } from '@features/staking';
import {
  MultisigTxWrapper,
  ProxyTxWrapper,
  WrapperKind,
  type Account,
  type BasketTransaction,
  type Transaction,
  type TxWrapper,
} from '@shared/core';
import { Step, NominateData, WalletData, FeeData } from '../lib/types';
import { nominateUtils } from '../lib/nominate-utils';
import { formModel } from './form-model';
import { confirmModel } from './confirm-model';
import { transactionBuilder, transactionService } from '@entities/transaction';
import { basketModel } from '@entities/basket/model/basket-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<WalletData>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $walletData = restore<WalletData | null>(flowStarted, null);
const $nominateData = createStore<NominateData | null>(null);
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
  },
  filter: ({ walletData }) => Boolean(walletData),
  fn: ({ walletData, wallets }, data) => {
    const signatories = 'signatory' in data && data.signatory ? [data.signatory] : [];

    return nominateUtils.getTxWrappers({
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
  clock: [$maxValidators.updates, formModel.output.formChanged, validatorsModel.output.formSubmitted],
  source: {
    step: $step,
    nominateData: $nominateData,
  },
  filter: ({ step, nominateData }, data) => {
    return (!nominateUtils.isNoneStep(step) && Boolean(nominateData)) || typeof data !== 'number';
  },
  fn: ({ nominateData }, data) => {
    if (typeof data === 'number') {
      return { ...(nominateData || ({} as NominateData)), validators: Array(data).fill({ address: TEST_ADDRESS }) };
    }

    if (Array.isArray(data)) {
      return { ...nominateData!, validators: data! };
    }

    return { ...data!, validators: nominateData?.validators || [] };
  },
  target: $nominateData,
});

sample({
  clock: $nominateData.updates,
  source: $walletData,
  filter: (walletData, nominateData) => Boolean(walletData) && Boolean(nominateData),
  fn: (walletData, nominateData) => {
    return nominateData!.shards.map((shard) => {
      return transactionBuilder.buildNominate({
        chain: walletData!.chain,
        accountId: shard.accountId,
        nominators: nominateData!.validators.map(({ address }) => address),
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
  source: $walletData,
  filter: (walletData: WalletData | null): walletData is WalletData => Boolean(walletData),
  fn: ({ chain }) => ({
    event: { chain, asset: getRelaychainAsset(chain.assets)! },
    step: Step.VALIDATORS,
  }),
  target: spread({
    event: validatorsModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: validatorsModel.output.formSubmitted,
  source: {
    nominateData: $nominateData,
    feeData: $feeData,
    walletData: $walletData,
    txWrappers: $txWrappers,
  },
  filter: ({ nominateData, walletData }) => Boolean(nominateData) && Boolean(walletData),
  fn: ({ nominateData, feeData, walletData, txWrappers }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        chain: walletData!.chain,
        asset: getRelaychainAsset(walletData!.chain.assets)!,
        ...nominateData!,
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
    nominateData: $nominateData,
    walletData: $walletData,
    transactions: $transactions,
    txWrappers: $txWrappers,
  },
  filter: ({ nominateData, walletData, transactions }) => {
    return Boolean(nominateData) && Boolean(walletData) && Boolean(transactions);
  },
  fn: ({ nominateData, walletData, transactions, txWrappers }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        chainId: walletData!.chain.chainId,
        accounts: wrapper ? [wrapper.proxyAccount] : nominateData!.shards,
        signatory: nominateData!.signatory,
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
    nominateData: $nominateData,
    walletData: $walletData,
    transactions: $transactions,
  },
  filter: ({ nominateData, walletData, transactions }) => {
    return Boolean(nominateData) && Boolean(walletData) && Boolean(transactions);
  },
  fn: (nominateFlowData, signParams) => ({
    event: {
      ...signParams,
      chainId: nominateFlowData.walletData!.chain.chainId,
      account: nominateFlowData.nominateData!.shards[0],
      signatory: nominateFlowData.nominateData!.signatory,
      description: nominateFlowData.nominateData!.description,
      coreTxs: nominateFlowData.transactions!.map((tx) => tx.coreTx),
      wrappedTxs: nominateFlowData.transactions!.map((tx) => tx.wrappedTx),
      multisigTxs: nominateFlowData.transactions!.map((tx) => tx.multisigTx).filter(nonNullable),
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
  source: $step,
  filter: (step) => nominateUtils.isSubmitStep(step),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared, validatorsModel.events.formCleared],
});

sample({
  clock: txSaved,
  source: {
    store: $walletData,
    coreTxs: $pureTxs,
    txWrappers: $txWrappers,
  },
  filter: ({ store, coreTxs, txWrappers }: any) => {
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
        } as BasketTransaction),
    );

    return txs;
  },
  target: basketModel.events.transactionsCreated,
});

sample({
  clock: txSaved,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared],
});

export const nominateModel = {
  $step,
  $walletData,
  $initiatorWallet: $walletData.map((data) => data?.wallet),

  events: {
    flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
