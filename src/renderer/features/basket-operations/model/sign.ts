import { createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type BasketTransaction } from '@/shared/core';
import { type ChainError } from '@/shared/core/types/basket';
import { toAccountId } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { type FeeMap } from '@/features/operations/OperationsValidation';
import { Step } from '../types';

const flowStarted = createEvent<{ transactions: BasketTransaction[]; feeMap: FeeMap }>();
const flowFinished = createEvent();
const stepChanged = createEvent<Step>();
const txsConfirmed = createEvent();

const $step = restore(stepChanged, Step.NONE).reset(flowFinished);
const $transactions = createStore<BasketTransaction[]>([]).reset(flowFinished);

sample({
  clock: flowStarted,
  fn: () => Step.CONFIRM,
  target: $step,
});

sample({
  clock: flowStarted,
  fn: ({ transactions }) => transactions,
  target: $transactions,
});

sample({
  clock: txsConfirmed,
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
  target: basketOperations.removeTransactions,
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
  target: basketOperations.updateTransactions,
});

export const signOperations = {
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
