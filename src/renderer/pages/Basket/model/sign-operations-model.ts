import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import {
  type Balance,
  type BasketTransaction,
  type Chain,
  type ChainId,
  type Connection,
  TransactionType,
  type Wallet,
} from '@/shared/core';
import { type ChainError } from '@/shared/core/types/basket';
import { toAccountId } from '@/shared/lib/utils';
import { balanceModel } from '@/entities/balance';
import { basketModel } from '@/entities/basket';
import { networkModel } from '@/entities/network';
import {
  type MultisigTransactionTypes,
  type TransferTransactionTypes,
  TransferTypes,
  type UtilityTransactionTypes,
  type XcmTransactionTypes,
  XcmTypes,
  isEditDelegationTransaction,
} from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';
import { ExtrinsicResult } from '@/features/operations/OperationSubmit/lib/types';
import {
  addProxyConfirmModel,
  addPureProxiedConfirmModel,
  bondExtraConfirmModel,
  bondNominateConfirmModel,
  delegateConfirmModel,
  editDelegationConfirmModel,
  fellowshipVotingConfirmModel,
  nominateConfirmModel,
  payeeConfirmModel,
  removeProxyConfirmModel,
  removePureProxiedConfirmModel,
  removeVoteConfirmModel,
  restakeConfirmModel,
  revokeDelegationConfirmModel,
  transferConfirmModel,
  unstakeConfirmModel,
  voteConfirmModel,
  withdrawConfirmModel,
} from '@/features/operations/OperationsConfirm';
import { type FeeMap } from '@/features/operations/OperationsValidation';
import { unlockConfirmAggregate } from '@/widgets/UnlockModal';
import { type DataParams, prepareTransaction } from '../lib/prepareTransactions';
import { getCoreTx } from '../lib/utils';
import { Step } from '../types';

const flowStarted = createEvent<{ transactions: BasketTransaction[]; feeMap: FeeMap }>();
const flowFinished = createEvent();
const stepChanged = createEvent<Step>();
const txsConfirmed = createEvent();

const $signerOptions = createStore<FeeMap>({});

type PrepareDataParams = {
  wallets: Wallet[];
  chains: Record<ChainId, Chain>;
  apis: Record<ChainId, ApiPromise>;
  transactions: BasketTransaction[];
  connections: Record<ChainId, Connection>;
  feeMap: FeeMap;
  balances: Balance[];
};

const startDataPreparationFx = createEffect(async ({ transactions, ...preparationParams }: PrepareDataParams) => {
  const dataParams = [];

  for (const transaction of transactions) {
    if (isEditDelegationTransaction(transaction.coreTx)) {
      const params = await prepareTransaction.prepareEditDelegationTransaction({
        transaction,
        ...preparationParams,
      });

      dataParams.push({ type: TransactionType.EDIT_DELEGATION, params });
    }

    const coreTx = getCoreTx(transaction);

    if (TransferTypes.includes(coreTx.type) || XcmTypes.includes(coreTx.type)) {
      const params = await prepareTransaction.prepareTransferTransactionData({
        transaction,
        ...preparationParams,
      });

      dataParams.push({ type: TransactionType.TRANSFER, params });
    }

    const TransactionData: Record<
      Exclude<
        TransactionType,
        | TransferTransactionTypes
        | XcmTransactionTypes
        | MultisigTransactionTypes
        | UtilityTransactionTypes
        | TransactionType.REMARK
      >,
      (dataParams: DataParams) => Promise<unknown>
    > = {
      [TransactionType.ADD_PROXY]: prepareTransaction.prepareAddProxyTransaction,
      [TransactionType.CREATE_PURE_PROXY]: prepareTransaction.prepareAddPureProxiedTransaction,
      [TransactionType.REMOVE_PROXY]: prepareTransaction.prepareRemoveProxyTransaction,
      [TransactionType.REMOVE_PURE_PROXY]: prepareTransaction.prepareRemovePureProxiedTransaction,

      [TransactionType.BOND]: prepareTransaction.prepareBondNominateTransaction,
      [TransactionType.NOMINATE]: prepareTransaction.prepareNominateTransaction,
      [TransactionType.STAKE_MORE]: prepareTransaction.prepareBondExtraTransaction,
      [TransactionType.DESTINATION]: prepareTransaction.preparePayeeTransaction,
      [TransactionType.RESTAKE]: prepareTransaction.prepareRestakeTransaction,
      [TransactionType.UNSTAKE]: prepareTransaction.prepareUnstakeTransaction,
      [TransactionType.REDEEM]: prepareTransaction.prepareWithdrawTransaction,
      [TransactionType.UNLOCK]: prepareTransaction.prepareUnlockTransaction,
      [TransactionType.DELEGATE]: prepareTransaction.prepareDelegateTransaction,
      [TransactionType.EDIT_DELEGATION]: prepareTransaction.prepareEditDelegationTransaction,
      [TransactionType.UNDELEGATE]: prepareTransaction.prepareRevokeDelegationTransaction,
      [TransactionType.VOTE]: prepareTransaction.prepareVoteTransaction,
      [TransactionType.REVOTE]: prepareTransaction.prepareVoteTransaction,
      [TransactionType.REMOVE_VOTE]: prepareTransaction.prepareRemoveVoteTransaction,
      [TransactionType.COLLECTIVE_VOTE]: prepareTransaction.prepareCollectiveVoteTransaction,
    };

    if (coreTx.type in TransactionData) {
      // @ts-expect-error TS thinks that transfer should be in TransactionData
      const params = await TransactionData[coreTx.type]({
        transaction,
        ...preparationParams,
      });

      dataParams.push({ type: coreTx.type, params });
    }
  }

  return dataParams;
});

const $step = restore(stepChanged, Step.NONE);
const $transactions = createStore<BasketTransaction[]>([]).reset(flowFinished);

const $txDataParams = combine({
  wallets: walletModel.$wallets,
  chains: networkModel.$chains,
  apis: networkModel.$apis,
  connections: networkModel.$connections,
  signerOptions: $signerOptions,
  balances: balanceModel.$balances,
});

sample({
  clock: flowStarted,
  source: $txDataParams,
  fn: ({ wallets, chains, apis, connections, balances }, { transactions, feeMap }) => ({
    transactions,
    wallets,
    chains,
    apis,
    connections,
    feeMap,
    balances,
  }),
  target: startDataPreparationFx,
});

sample({
  clock: flowStarted,
  target: spread({
    transactions: $transactions,
    signerOptions: $signerOptions,
  }),
});

sample({
  clock: flowStarted,
  source: $transactions,
  filter: (txs) => txs.length > 0,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

// Transfer

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return (
      dataParams?.filter((tx) => {
        return tx.type === TransactionType.TRANSFER;
      }).length > 0
    );
  },
  fn: (dataParams) => {
    return (
      dataParams
        ?.filter((tx) => {
          return tx.type === TransactionType.TRANSFER;
        })
        .map((tx) => tx.params) || []
    );
  },
  target: transferConfirmModel.events.formInitiated,
});

// Add proxy

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.ADD_PROXY).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.ADD_PROXY).map((tx) => tx.params) || [];
  },
  target: addProxyConfirmModel.events.formInitiated,
});

// Add pure proxied

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.CREATE_PURE_PROXY).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.CREATE_PURE_PROXY).map((tx) => tx.params) || [];
  },
  target: addPureProxiedConfirmModel.events.formInitiated,
});

// Remove proxy

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REMOVE_PROXY).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REMOVE_PROXY).map((tx) => tx.params) || [];
  },
  target: removeProxyConfirmModel.events.formInitiated,
});

// Remove pure proxied

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REMOVE_PURE_PROXY).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REMOVE_PURE_PROXY).map((tx) => tx.params) || [];
  },
  target: removePureProxiedConfirmModel.events.formInitiated,
});

// Bond nominate

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.BOND).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.BOND).map((tx) => tx.params) || [];
  },
  target: bondNominateConfirmModel.events.formInitiated,
});

// Nominate

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.NOMINATE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.NOMINATE).map((tx) => tx.params) || [];
  },
  target: nominateConfirmModel.events.formInitiated,
});

// Payee

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.DESTINATION).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.DESTINATION).map((tx) => tx.params) || [];
  },
  target: payeeConfirmModel.events.formInitiated,
});

// Bond extra

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.STAKE_MORE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.STAKE_MORE).map((tx) => tx.params) || [];
  },
  target: bondExtraConfirmModel.events.formInitiated,
});

// Unstake

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.UNSTAKE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.UNSTAKE).map((tx) => tx.params) || [];
  },
  target: unstakeConfirmModel.events.formInitiated,
});

// Restake

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.RESTAKE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.RESTAKE).map((tx) => tx.params) || [];
  },
  target: restakeConfirmModel.events.formInitiated,
});

// Withdraw

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REDEEM).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REDEEM).map((tx) => tx.params) || [];
  },
  target: withdrawConfirmModel.events.formInitiated,
});

// Vote

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.VOTE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.VOTE).map((tx) => tx.params) || [];
  },
  target: voteConfirmModel.events.fillConfirm,
});

// Revote

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REVOTE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REVOTE).map((tx) => tx.params) || [];
  },
  target: voteConfirmModel.events.fillConfirm,
});

// Remove vote

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REMOVE_VOTE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.REMOVE_VOTE).map((tx) => tx.params) || [];
  },
  target: removeVoteConfirmModel.events.fillConfirm,
});

// Unlock

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.UNLOCK).length > 0;
  },
  fn: (dataParams) => {
    return (
      dataParams
        ?.filter((tx) => tx.type === TransactionType.UNLOCK || tx.type === TransactionType.REMOVE_VOTE)
        .map((tx) => tx.params) || []
    );
  },
  target: unlockConfirmAggregate.events.formInitiated,
});

// Delegate

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.DELEGATE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.DELEGATE).map((tx) => tx.params) || [];
  },
  target: delegateConfirmModel.events.formInitiated,
});

// Edit delegation

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.EDIT_DELEGATION).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.EDIT_DELEGATION).map((tx) => tx.params) || [];
  },
  target: editDelegationConfirmModel.events.formInitiated,
});

// revoke delegation (undelegate)

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.UNDELEGATE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.UNDELEGATE).map((tx) => tx.params) || [];
  },
  target: revokeDelegationConfirmModel.events.formInitiated,
});

// revoke delegation (undelegate)

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.UNDELEGATE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.UNDELEGATE).map((tx) => tx.params) || [];
  },
  target: revokeDelegationConfirmModel.events.formInitiated,
});

// collectives voting

sample({
  clock: startDataPreparationFx.doneData,
  filter: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.COLLECTIVE_VOTE).length > 0;
  },
  fn: (dataParams) => {
    return dataParams?.filter((tx) => tx.type === TransactionType.COLLECTIVE_VOTE).map((tx) => tx.params) || [];
  },
  target: fellowshipVotingConfirmModel.events.fillConfirm,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: $step,
});

sample({
  clock: [
    transferConfirmModel.output.formConfirmed,
    addProxyConfirmModel.output.formSubmitted,
    addPureProxiedConfirmModel.output.formSubmitted,
    removeProxyConfirmModel.output.formSubmitted,
    removePureProxiedConfirmModel.output.formSubmitted,
    bondExtraConfirmModel.output.formSubmitted,
    bondNominateConfirmModel.output.formSubmitted,
    nominateConfirmModel.output.formSubmitted,
    payeeConfirmModel.output.formSubmitted,
    restakeConfirmModel.output.formSubmitted,
    unstakeConfirmModel.output.formSubmitted,
    withdrawConfirmModel.output.formSubmitted,
    delegateConfirmModel.output.formSubmitted,
    editDelegationConfirmModel.output.formSubmitted,
    revokeDelegationConfirmModel.output.formSubmitted,
    unlockConfirmAggregate.output.formSubmitted,
    voteConfirmModel.events.sign,
    removeVoteConfirmModel.events.sign,
    fellowshipVotingConfirmModel.events.sign,
    txsConfirmed,
  ],
  source: {
    transactions: $transactions,
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
  },
  filter: ({ transactions }) => Boolean(transactions) && transactions.length > 0,
  fn: ({ transactions, wallets, chains }) => {
    const signingPayloads = transactions.map((tx: BasketTransaction) => {
      const accounts = walletUtils.getAccountsBy(wallets, (account, wallet) => {
        return wallet.id === tx.initiatorWallet && account.accountId === toAccountId(tx.coreTx.address);
      });

      return {
        chain: chains[tx.coreTx.chainId],
        account: accounts[0],
        transaction: tx.coreTx,
        signatory: null,
      };
    });

    return {
      event: { signingPayloads },
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
    transactions: $transactions,
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
  },
  filter: ({ transactions }) => {
    return Boolean(transactions) && transactions.length > 0;
  },
  fn: ({ transactions, chains, wallets }, signParams) => {
    const account = walletUtils.getAccountsBy(wallets, (account, wallet) => {
      return (
        wallet.id === transactions[0].initiatorWallet &&
        account.accountId === toAccountId(transactions[0].coreTx.address)
      );
    });

    return {
      event: {
        ...signParams,
        chain: chains[transactions[0].coreTx.chainId],
        account: account[0],
        description: '',
        coreTxs: transactions.map((tx) => tx.coreTx!),
        wrappedTxs: transactions.map((tx) => tx.coreTx!),
        multisigTxs: [],
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
  clock: submitModel.output.formSubmitted,
  source: $transactions,
  fn: (transactions, results) => {
    return transactions.filter((tx, index) =>
      results.some((result) => result.id === index && result.result === ExtrinsicResult.SUCCESS),
    );
  },
  target: basketModel.events.transactionsRemoved,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: $transactions,
  fn: (transactions, results) => {
    return transactions.reduce<BasketTransaction[]>((acc, tx, index) => {
      const result = results.find((result) => result.id === index);

      if (result?.result === ExtrinsicResult.ERROR) {
        acc.push({
          ...tx,
          error: {
            type: 'chain',
            // params will be a string for failed transaction
            message: result.params as string,
            dateCreated: Date.now(),
          } as ChainError,
        });
      }

      return acc;
    }, []);
  },
  target: basketModel.events.transactionsUpdated,
});

export const signOperationsModel = {
  $step,
  $transactions,

  events: {
    flowStarted,
    txsConfirmed,
    stepChanged,
  },
  output: {
    flowFinished,
  },
};
