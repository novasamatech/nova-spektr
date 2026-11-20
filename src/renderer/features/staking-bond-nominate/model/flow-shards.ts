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
import { getSigningPayloads } from '@/shared/transactions';
import { type AnyAccount, multisigOperationService } from '@/domains/network';
import { validatorsService } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { bondNominateConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type BondNominateConfirm } from '@/features/operations/OperationsConfirm/BondNominate/model/confirm-model';
import { getSigningMode, validatorSelectionModel } from '@/features/validator-selection';
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
  clock: [$maxValidators.updates, formModelShards.formChanged, validatorSelectionModel.output.formSubmitted],
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

// The shards flow bonds several shard accounts at once, so there is no single
// acting account to name unless exactly one shard is selected — the header chip
// stays empty rather than presenting the first shard as the whole operation.
// This flow has no draft mode, so the signing info the footer reads never
// applies here.
sample({
  clock: formModelShards.formSubmitted,
  source: $walletData,
  filter: (walletData: WalletData | null): walletData is WalletData => Boolean(walletData),
  fn: ({ chain, wallet, shards }) => ({
    event: {
      chain,
      asset: getRelaychainAsset(chain.assets)!,
      signingMode: getSigningMode({ isDraftMode: false, wallet }),
      initiator: shards.length === 1 ? shards[0] : undefined,
      initiatorWallet: wallet,
    },
    step: Step.VALIDATORS,
  }),
  target: spread({
    event: validatorSelectionModel.events.formInitiated,
    step: stepChanged,
  }),
});

// The validators are picked right before the confirm step opens, and the
// transactions for them are built a moment later: the open step is filled
// again whenever they (or their fee) change, so it never keeps transactions
// built for the previous set.
const confirmOutdated = sample({
  clock: [$pureTxs, $txWrappers, $feeData],
  source: $step,
  filter: bondNominateUtils.isConfirmStep,
});

sample({
  clock: [validatorSelectionModel.output.formSubmitted, confirmOutdated],
  source: {
    bondData: $bondNominateData,
    feeData: $feeData,
    walletData: $walletData,
    txWrappers: $txWrappers,
    transactions: $transactions,
  },
  filter: ({ bondData, walletData, transactions }) => {
    return Boolean(bondData) && Boolean(walletData) && Boolean(transactions);
  },
  fn: ({ bondData, feeData, walletData, txWrappers, transactions }) => {
    const proxyWrapper = txWrappers.find((wrapper): wrapper is ProxyTxWrapper => wrapper.kind === WrapperKind.PROXY);

    return {
      // One item per shard, each holding the transaction that shard signs and the account signing it.
      event: transactions!.map(({ wrappedTx, coreTx }, index) => {
        const shard = bondData!.shards[index]!;

        return {
          chain: walletData!.chain,
          asset: getRelaychainAsset(walletData!.chain.assets)!,
          ...bondData!,
          ...feeData,
          initiator: shard,
          signatory: bondData!.signatory ?? proxyWrapper?.proxyAccount ?? shard,
          route: [shard],
          coreTx,
          tx: wrappedTx,
          signingPath: [],
        } satisfies BondNominateConfirm;
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
  clock: confirmModel.confirmed,
  source: {
    bondData: $bondNominateData,
    walletData: $walletData,
  },
  filter: ({ bondData, walletData }) => Boolean(bondData) && Boolean(walletData),
  fn: (_, confirms) => ({
    event: { signingPayloads: getSigningPayloads(confirms) },
    step: Step.SIGN,
  }),
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
    confirms: confirmModel.$confirmed,
  },
  filter: ({ bondData, walletData, confirms }) => {
    return Boolean(bondData) && Boolean(walletData) && confirms.length > 0;
  },
  fn: (bondFlowData, signParams) => ({
    event: {
      ...signParams,
      chain: bondFlowData.walletData!.chain,
      account: bondFlowData.bondData!.shards[0]!,
      signatory: bondFlowData.bondData!.signatory,
      coreTxs: bondFlowData.confirms.map((confirm) => confirm.coreTx),
      wrappedTxs: bondFlowData.confirms.map((confirm) => confirm.tx),
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
  target: [stepChanged, formModelShards.formCleared, validatorSelectionModel.events.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { isMultisig: formModelShards.$isMultisig, confirms: confirmModel.$confirmed },
  filter: ({ isMultisig, confirms }, results) =>
    isMultisig && confirms.length > 0 && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ confirms }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;
    const { coreTx, tx } = confirms[0]!;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx.chainId,
      callHash: tx.args.callHash,
      multisigAccountId: coreTx.accountId,
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

  flowStarted,
  stepChanged,
  txSaved,
  flowFinished,
};
