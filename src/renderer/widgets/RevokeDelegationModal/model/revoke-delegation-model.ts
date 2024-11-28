import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { delay, spread } from 'patronum';

import {
  type Account,
  type Address,
  type BasketTransaction,
  type MultisigTxWrapper,
  type ProxyTxWrapper,
  type Transaction,
  type TxWrapper,
  WrapperKind,
} from '@/shared/core';
import { Step, getRelaychainAsset, isStep, nonNullable, toAddress, transferableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { basketModel } from '@/entities/basket';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { delegationAggregate, networkSelectorModel } from '@/features/governance';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';
import { revokeDelegationConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type FeeData, type RevokeDelegationData } from '../lib/types';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<{ delegate: Address; accounts: Account[] }>();
const flowFinished = createEvent();
const txSaved = createEvent();
const txsConfirmed = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $walletData = combine(
  {
    wallet: walletModel.$activeWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ wallet, chain }) => ({ wallet, chain }),
);

const $revokeDelegationData = createStore<RevokeDelegationData[]>([]);
const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });

const $txWrappers = createStore<TxWrapper[]>([]);
const $coreTxs = createStore<Transaction[]>([]);

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

// Signatory

const selectSignatory = createEvent<Account>();

const $signatory = createStore<Account | null>(null);

const $signatories = combine($walletData, walletModel.$wallets, (wallet, wallets) => {
  const account = wallet.wallet?.accounts[0];

  if (!account || !accountUtils.isMultisigAccount(account)) {
    return [];
  }

  const a = account.signatories.map((signatory) =>
    walletUtils.getAccountBy(wallets, (a) => a.accountId === signatory.accountId),
  );

  return a.filter((option) => option !== null);
});

sample({
  clock: $signatories,
  filter: $signatories.map((x) => x.length < 2),
  fn: (s) => s.at(0) ?? null,
  target: $signatory,
});

sample({
  clock: selectSignatory,
  target: $signatory,
});

// Transaction & Form

sample({
  clock: flowStarted,
  source: {
    activeTracks: delegationAggregate.$activeTracks,
    walletData: $walletData,
  },
  fn: ({ activeTracks, walletData }, { delegate, accounts }) => {
    return accounts.map((account) => {
      const address = toAddress(account.accountId, { prefix: walletData.chain?.addressPrefix });
      const tracksNumber = Object.keys(activeTracks[delegate][address]).map(Number);

      return {
        account,
        signatory: null,
        target: delegate,
        tracks: tracksNumber,
        locks: { [account.accountId]: new BN(0) },
      };
    });
  },
  target: $revokeDelegationData,
});

sample({
  clock: $signatory.updates,
  source: $revokeDelegationData,
  fn: (data, signatory) => {
    return data.map((d) => ({ ...d, signatory }));
  },
  target: $revokeDelegationData,
});

sample({
  clock: [flowStarted, $signatory.updates],
  source: {
    walletData: $walletData,
    signatory: $signatory,
    wallets: walletModel.$wallets,
  },
  filter: ({ walletData }) => !!walletData.wallet,
  fn: ({ walletData, wallets, signatory }) => {
    return transactionService.getTxWrappers({
      wallet: walletData.wallet!,
      wallets,
      account: walletData.wallet!.accounts[0],
      signatories: signatory ? [signatory] : [],
    });
  },
  target: $txWrappers,
});

sample({
  clock: flowStarted,
  source: {
    walletData: $walletData,
    activeTracks: delegationAggregate.$activeTracks,
    revokeDelegationData: $revokeDelegationData,
  },
  filter: ({ walletData, revokeDelegationData }) => {
    return !!walletData.chain || revokeDelegationData.length > 0;
  },
  fn: ({ walletData, revokeDelegationData, activeTracks }) => {
    return revokeDelegationData.map((data) =>
      transactionBuilder.buildUndelegate({
        chain: walletData.chain!,
        accountId: data.account!.accountId,
        tracks:
          activeTracks[data.target][toAddress(data.account.accountId, { prefix: walletData.chain?.addressPrefix })].map(
            Number,
          ),
      }),
    );
  },
  target: $coreTxs,
});

sample({
  clock: $transactions,
  source: $api,
  filter: (api, transactions) => !!api && !!transactions?.length,
  fn: (api, transactions) => ({
    api: api!,
    transaction: transactions![0].wrappedTx,
  }),
  target: getTransactionFeeFx,
});

sample({
  clock: $txWrappers,
  source: $api,
  filter: (api, txWrappers) => !!api && transactionService.hasMultisig(txWrappers),
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

// Steps

sample({
  clock: stepChanged,
  target: $step,
});

sample({
  clock: [flowStarted, $revokeDelegationData.updates],
  source: {
    balances: balanceModel.$balances,
    feeData: $feeData,
    walletData: $walletData,
    txWrappers: $txWrappers,
    revokeDelegationData: $revokeDelegationData,
    delegations: delegationAggregate.$activeDelegations,
    coreTxs: $coreTxs,
    signatory: $signatory,
  },
  filter: ({ walletData, revokeDelegationData }) => {
    return revokeDelegationData.length > 0 && !!walletData.wallet && !!walletData.chain;
  },
  fn: ({ feeData, balances, walletData, txWrappers, revokeDelegationData, delegations, coreTxs }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;
    const asset = getRelaychainAsset(walletData.chain!.assets)!;

    return {
      event: revokeDelegationData.map((revokeData) => {
        const target = revokeData.target;
        const delegation = delegations[target];
        const delegationData = Object.values(delegation)[0];

        return {
          chain: walletData.chain!,
          asset: asset!,
          balance: delegationData.balance.toString(),
          conviction: delegationData.conviction,
          transferable: transferableAmount(
            balanceUtils.getBalance(
              balances,
              revokeData.account!.accountId,
              walletData.chain!.chainId,
              asset.assetId.toString(),
            ),
          ),

          ...revokeData!,
          ...feeData,
          ...(wrapper && { proxiedAccount: wrapper.proxiedAccount }),
          ...(wrapper ? { shards: [wrapper.proxyAccount] } : { shards: [revokeData.account!] }),
          locks: revokeData.locks[revokeData.account!.accountId],
          coreTx: coreTxs[0],
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
    revokeDelegationData: $revokeDelegationData,
    walletData: $walletData,
    transactions: $transactions,
    txWrappers: $txWrappers,
    step: $step,
  },
  filter: ({ revokeDelegationData, walletData, transactions, step }) => {
    return revokeDelegationData.length > 0 && !!walletData && !!transactions && isStep(step, Step.CONFIRM);
  },
  fn: ({ revokeDelegationData, walletData, transactions, txWrappers }) => {
    const wrapper = txWrappers.find(({ kind }) => kind === WrapperKind.PROXY) as ProxyTxWrapper;

    return {
      event: {
        signingPayloads:
          transactions?.map((tx, index) => ({
            chain: walletData.chain!,
            account: wrapper ? wrapper.proxyAccount : revokeDelegationData[index]!.account,
            signatory: revokeDelegationData[0]!.signatory,
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
    revokeDelegationData: $revokeDelegationData,
    step: $step,
  },
  filter: ({ revokeDelegationData, walletData, transactions, step }) => {
    return !!revokeDelegationData && !!walletData && !!transactions && isStep(step, Step.SIGN);
  },
  fn: ({ walletData, revokeDelegationData, transactions }, signParams) => ({
    event: {
      ...signParams,
      chain: walletData.chain!,
      account: revokeDelegationData[0]!.account,
      signatory: revokeDelegationData[0]!.signatory,
      coreTxs: transactions!.map((tx) => tx.coreTx),
      wrappedTxs: transactions!.map((tx) => tx.wrappedTx),
      multisigTxs: transactions!.map((tx) => tx.multisigTx).filter(nonNullable),
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
  filter: (step) => isStep(step, Step.SUBMIT),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

sample({
  clock: txSaved,
  source: {
    walletData: $walletData,
    coreTxs: $coreTxs,
    txWrappers: $txWrappers,
  },
  filter: ({ walletData, coreTxs, txWrappers }) => {
    return nonNullable(walletData.wallet) && nonNullable(coreTxs) && nonNullable(txWrappers);
  },
  fn: ({ walletData, coreTxs, txWrappers }) => {
    return coreTxs!.map((coreTx) => {
      return {
        coreTx,
        txWrappers,
        groupId: Date.now(),
        initiatorWallet: walletData.wallet!.id,
      } as BasketTransaction;
    });
  },
  target: basketModel.events.transactionsCreated,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const revokeDelegationModel = {
  $step,
  $walletData,
  $initiatorWallet: $walletData.map((data) => data?.wallet || null),
  $transactions,
  $signatories,
  $signatory,
  $network: networkSelectorModel.$network,

  events: {
    flowStarted,
    stepChanged,
    txSaved,
    txsConfirmed,
    selectSignatory,
  },
  output: {
    flowFinished,
  },
};
