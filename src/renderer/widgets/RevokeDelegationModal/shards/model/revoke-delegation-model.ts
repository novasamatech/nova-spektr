import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { combineEvents, delay, spread } from 'patronum';

import {
  type MultisigTxWrapper,
  type ProxyTxWrapper,
  type Transaction,
  type TxWrapper,
  WrapperKind,
} from '@/shared/core';
import { assert } from '@/shared/lib/utils';
import { Step, getRelaychainAsset, isStep, nonNullable, transferableAmount } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { votingModel } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { delegationAggregate, networkSelectorModel, votingAggregate } from '@/features/governance';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';
import { revokeDelegationConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type RevokeDelegationConfirm } from '@/features/operations/OperationsConfirm/RevokeDelegation/model/confirm-model';
import { type FeeData, type RevokeDelegationData } from '../lib/types';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<{ delegate: AccountId; accounts: AnyAccount[] }>();
const flowFinished = createEvent();
const txSaved = createEvent();
const txsConfirmed = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $walletData = combine({
  wallet: walletSelect.$selectedWallet,
  accounts: walletSelect.$selectedAccounts,
  chain: networkSelectorModel.$governanceChain,
});

const $txWrappers = createStore<TxWrapper[]>([]);
const $revokeDelegationData = createStore<RevokeDelegationData[]>([]);
const $feeData = createStore<FeeData>({ fee: '0', totalFee: '0', multisigDeposit: '0' });

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
    return walletData?.chain ? (apis[walletData.chain.chainId] ?? null) : null;
  },
);

// Signatory

const selectSignatory = createEvent<AnyAccount>();

const $signatory = createStore<AnyAccount | null>(null);

const $signatories = combine($walletData, walletModel.$wallets, (wallet, wallets) => {
  const account = wallet.wallet?.accounts[0];

  if (!account || !accountUtils.isAnyMultisigAccount(account)) {
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
      account: walletData.wallet!.accounts[0]!,
      signatories: signatory ? [signatory] : [],
    });
  },
  target: $txWrappers,
});

const $transactions = combine(
  {
    api: $api,
    coreTxs: $coreTxs,
    txWrappers: $txWrappers,
  },
  ({ api, coreTxs, txWrappers }) => {
    if (!api) return null;

    return coreTxs.map((tx) =>
      transactionService.getWrappedTransaction({
        api,
        transaction: tx,
        txWrappers,
      }),
    );
  },
);

// Transaction & Form

sample({
  clock: flowStarted,
  source: {
    activeTracks: delegationAggregate.$activeTracks,
  },
  fn: ({ activeTracks }, { delegate, accounts }) => {
    return accounts.map((account) => {
      const tracks = activeTracks[delegate]?.[account.accountId];
      const tracksNumber = tracks ? Object.keys(tracks).map(Number) : [];

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
    return revokeDelegationData.map((data) => {
      const tracks = activeTracks[data.target]?.[data.account.accountId];
      return transactionBuilder.buildUndelegate({
        chain: walletData.chain!,
        accountId: data.account!.accountId,
        tracks: tracks ? tracks.map(Number) : [],
      });
    });
  },
  target: $coreTxs,
});

sample({
  clock: $transactions,
  source: $api,
  filter: (api, transactions) => !!api && !!transactions?.length,
  fn: (api, transactions) => ({
    api: api!,
    transaction: transactions![0]!.wrappedTx,
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
  clock: [flowStarted, $revokeDelegationData.updates],
  source: {
    balances: balanceModel.$balanceMap,
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
    const asset = getRelaychainAsset(walletData.chain!.assets)!;

    return {
      event: revokeDelegationData.map((revokeData) => {
        const target = revokeData.target;
        const delegation = delegations[target];
        const delegationData = delegation && Object.values(delegation)[0];

        assert(delegationData, 'Delegation data is not found');

        return {
          chain: walletData.chain!,
          asset: asset!,
          balance: delegationData.balance.toString(),
          conviction: delegationData.conviction,
          transferable: transferableAmount(
            balanceUtils.getBalance(balances, revokeData.account!.accountId, walletData.chain!.chainId, asset.assetId),
          ),

          ...revokeData,
          ...feeData,
          initiator: revokeData.account,
          signatory: revokeData.account,
          delegate: revokeData.target,
          locks: revokeData.locks[revokeData.account!.accountId]!,
          route: txWrappers.map((wrapper) =>
            wrapper.kind === WrapperKind.PROXY ? wrapper.proxyAccount : wrapper.multisigAccount,
          ),
          coreTx: coreTxs[0]!,
          tx: coreTxs[0]!,
        } satisfies RevokeDelegationConfirm;
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
  clock: [confirmModel.startSigning, txsConfirmed],
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
  },
  filter: ({ coreTxs }) => nonNullable(coreTxs),
  fn: ({ coreTxs }) => {
    return coreTxs.map((coreTx) => {
      return {
        coreTx,
        initiatorAccountId: coreTx.accountId,
        route: [],
        createdAt: Date.now(),
      };
    });
  },
  target: basketOperations.addTransactions,
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

  flowStarted,
  stepChanged,
  txSaved,
  txsConfirmed,
  selectSignatory,
  flowFinished,
};
