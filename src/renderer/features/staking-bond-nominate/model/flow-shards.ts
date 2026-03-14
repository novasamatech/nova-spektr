import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import {
  type MultisigTxWrapper,
  type ProxyTxWrapper,
  type Transaction,
  type TxWrapper,
  RewardsDestination,
  WrapperKind,
} from '@/shared/core';
import { TEST_ADDRESS, getNativeAsset, getRelaychainAsset, nonNullable, toAddress } from '@/shared/lib/utils';
import { type AnyAccount, multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { operationsUtils } from '@/entities/operations';
import { validatorsService } from '@/entities/staking';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { bondNominateConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type BondNominateConfirm } from '@/features/operations/OperationsConfirm/BondNominate/model/confirm-model';
import { validatorsModel } from '@/features/staking';
import { type BondNominateDataShards, type FeeData, type WalletData, Step } from '../lib/types';
import { bondNominateUtils } from '../lib/utils';

import { formModelShards } from './form-model-shards';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<WalletData>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $walletData = restore<WalletData | null>(flowStarted, null).reset(flowFinished);
const $bondNominateData = createStore<BondNominateDataShards | null>(null).reset(flowFinished);
const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });

const $txWrappers = createStore<TxWrapper[]>([]).reset(flowFinished);
const $pureTxs = createStore<Transaction[]>([]).reset(flowFinished);

const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

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
    return walletData ? (apis[walletData.chain.chainId] ?? null) : null;
  },
);

const $transactions = combine(
  {
    api: $api,
    pureTxs: $pureTxs,
    txWrappers: $txWrappers,
  },
  ({ api, pureTxs, txWrappers }) => {
    if (!api) return null;

    return pureTxs.map((tx) =>
      transactionService.getWrappedTransaction({
        api,
        transaction: tx,
        txWrappers,
      }),
    );
  },
);

const $multisigAlreadyExists = combine(
  {
    apis: networkModel.$apis,
    coreTxs: $pureTxs,
    transactions: selectedWalletMultisigOperations.$list,
  },
  ({ apis, coreTxs, transactions }) => operationsUtils.isMultisigAlreadyExists({ apis, coreTxs, transactions }),
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
  clock: [flowStarted, formModelShards.formChanged],
  source: {
    walletData: $walletData,
    wallets: walletModel.$wallets,
  },
  filter: ({ walletData }) => Boolean(walletData),
  fn: ({ walletData, wallets }, data) => {
    const signatories = 'signatory' in data && data.signatory ? [data.signatory] : [];

    return bondNominateUtils.getTxWrappers({
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
  target: formModelShards.txWrapperChanged,
});

sample({
  clock: [$maxValidators.updates, formModelShards.formChanged, validatorsModel.output.formSubmitted],
  source: {
    step: $step,
    bondData: $bondNominateData,
  },
  filter: ({ step, bondData }, data) => {
    return (!bondNominateUtils.isNoneStep(step) && Boolean(bondData)) || typeof data !== 'number';
  },
  fn: ({ bondData }, data): BondNominateDataShards => {
    if (typeof data === 'number') {
      return {
        ...(bondData || ({} as BondNominateDataShards)),
        validators: Array(data).fill({ address: TEST_ADDRESS }),
      };
    }

    if (Array.isArray(data)) {
      return { ...bondData!, validators: data! };
    }

    // @ts-expect-error destination should be address
    return { ...data!, validators: bondData?.validators || [] };
  },
  target: $bondNominateData,
});

sample({
  clock: $bondNominateData.updates,
  source: {
    walletData: $walletData,
    destinationType: formModelShards.$destinationType,
  },
  filter: ({ walletData }, bondData) => Boolean(walletData) && Boolean(bondData),
  fn: ({ walletData, destinationType }, bondData) => {
    return bondData!.shards.map((shard) => {
      return transactionBuilder.buildBondNominate({
        chain: walletData!.chain,
        asset: getNativeAsset(walletData!.chain.assets)!,
        accountId: shard.accountId,
        amount: bondData!.amount,
        destination:
          destinationType === RewardsDestination.RESTAKE ? 'Staked' : { destination: toAddress(bondData!.destination) },
        nominators: bondData!.validators.map(({ accountId }) => accountId),
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
  target: formModelShards.isFeeLoadingChanged,
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
  target: formModelShards.feeDataChanged,
});

// Steps

sample({
  clock: flowStarted,
  target: formModelShards.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModelShards.formSubmitted,
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
    bondData: $bondNominateData,
    feeData: $feeData,
    walletData: $walletData,
    txWrappers: $txWrappers,
    coreTxs: $pureTxs,
  },
  filter: ({ bondData, walletData }) => Boolean(bondData) && Boolean(walletData),
  fn: ({ bondData, feeData, walletData, coreTxs }) => {
    return {
      event: [
        {
          chain: walletData!.chain,
          asset: getRelaychainAsset(walletData!.chain.assets)!,
          ...bondData!,
          ...feeData,
          initiator: bondData!.shards[0]!,
          signatory: bondData!.signatory!,
          route: [bondData!.shards[0]!],
          coreTx: coreTxs[0]!,
          tx: coreTxs[0]!,
        } satisfies BondNominateConfirm,
      ],
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
    bondData: $bondNominateData,
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
            account: wrapper ? wrapper.proxyAccount : bondData!.shards[index]!,
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
    bondData: $bondNominateData,
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
      account: bondFlowData.bondData!.shards[0]!,
      signatory: bondFlowData.bondData!.signatory,
      coreTxs: bondFlowData.transactions!.map((tx) => tx.coreTx),
      wrappedTxs: bondFlowData.transactions!.map((tx) => tx.wrappedTx),
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
  target: [stepChanged, formModelShards.formCleared, validatorsModel.events.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { isMultisig: formModelShards.$isMultisig, coreTx: $pureTxs, wrappedTx: $transactions },
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

export const bondNominateFlowShards = {
  $step,
  $walletData,
  $initiatorWallet: $walletData.map((data) => data?.wallet || null),
  $multisigAlreadyExists,

  flowStarted,
  stepChanged,
  txSaved,
  flowFinished,
};
