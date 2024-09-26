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
import { TEST_ADDRESS, getRelaychainAsset, nonNullable } from '@shared/lib/utils';
import { basketModel } from '@entities/basket/model/basket-model';
import { networkModel } from '@entities/network';
import { validatorsService } from '@entities/staking';
import { transactionBuilder, transactionService } from '@entities/transaction';
import { walletModel } from '@entities/wallet';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@features/operations/OperationSubmit';
import { nominateConfirmModel as confirmModel } from '@features/operations/OperationsConfirm';
import { validatorsModel } from '@features/staking';
import { nominateUtils } from '../lib/nominate-utils';
import { type FeeData, type NominateData, Step, type WalletData } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<WalletData>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $walletData = restore<WalletData | null>(flowStarted, null).reset(flowFinished);
const $nominateData = createStore<NominateData | null>(null).reset(flowFinished);
const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });

const $txWrappers = createStore<TxWrapper[]>([]).reset(flowFinished);
const $pureTxs = createStore<Transaction[]>([]).reset(flowFinished);

const $maxValidators = createStore<number>(0);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

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
    coreTxs: $pureTxs,
  },
  filter: ({ nominateData, walletData }) => Boolean(nominateData) && Boolean(walletData),
  fn: ({ nominateData, feeData, walletData, txWrappers, coreTxs }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: [
        {
          chain: walletData!.chain,
          asset: getRelaychainAsset(walletData!.chain.assets)!,
          ...nominateData!,
          ...feeData,
          ...(wrapper && { proxiedAccount: wrapper.proxiedAccount }),
          ...(wrapper && { shards: [wrapper.proxyAccount] }),
          coreTxs: coreTxs[0],
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
        signingPayloads: transactions!.map((tx, index) => ({
          chain: walletData!.chain,
          account: wrapper ? wrapper.proxyAccount : nominateData!.shards[index],
          signatory: nominateData!.signatory,
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
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.events.formCleared, validatorsModel.events.formCleared],
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

export const nominateModel = {
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
