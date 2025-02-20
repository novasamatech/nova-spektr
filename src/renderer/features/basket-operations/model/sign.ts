import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type BasketTransaction } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { signOperationsUtils } from '../service/sign-operations-utils';
import { Step } from '../types';

const startFlow = createEvent<{ transactions: BasketTransaction[] }>();
const finishFlow = createEvent();
const changeStep = createEvent<Step>();
const confirm = createEvent();

const $step = restore(changeStep, Step.NONE).reset(finishFlow);
const $transactions = createStore<BasketTransaction[]>([]).reset(finishFlow);

const $isModalOpen = combine($step, step => !signOperationsUtils.isNoneStep(step));

sample({
  clock: startFlow,
  fn: () => Step.CONFIRM,
  target: $step,
});

sample({
  clock: startFlow,
  fn: ({ transactions }) => transactions,
  target: $transactions,
});

sample({
  clock: confirm,
  source: {
    transactions: $transactions,
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
  },
  filter: ({ transactions }) => Boolean(transactions) && transactions.length > 0,
  fn: ({ transactions, wallets, chains }) => {
    const signingPayloads = transactions.map((tx: BasketTransaction) => {
      const accounts = walletUtils.getAccountsBy(wallets, account => {
        return account.accountId === tx.initiatorAccountId && account.accountId === toAccountId(tx.coreTx.address);
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
    step: changeStep,
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
    const account = walletUtils.getAccountsBy(wallets, account => {
      return (
        account.accountId === transactions[0].initiatorAccountId &&
        account.accountId === toAccountId(transactions[0].coreTx.address)
      );
    });

    return {
      event: {
        ...signParams,
        chain: chains[transactions[0].coreTx.chainId],
        account: account[0],
        description: '',
        coreTxs: transactions.map(tx => tx.coreTx!),
        wrappedTxs: transactions.map(tx => tx.coreTx!),
        multisigTxs: [],
      },
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.events.formInitiated,
    step: changeStep,
  }),
});

sample({
  clock: submitModel.output.formSubmitted,
  source: $transactions,
  fn: (transactions, results) => {
    return transactions.filter((tx, index) =>
      results.some(result => result.id === index && result.result === ExtrinsicResult.SUCCESS),
    );
  },
  target: basketOperations.removeTransactions,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: $transactions,
  fn: (transactions, results) => {
    return transactions.reduce<BasketTransaction[]>((acc, tx, index) => {
      const result = results.find(result => result.id === index);

      if (result?.result === ExtrinsicResult.ERROR) {
        acc.push({
          ...tx,
          error: {
            type: 'chain',
            // params will be a string for failed transaction
            message: result.params as string,
            at: Date.now(),
          },
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
  $isModalOpen,

  startFlow,
  finishFlow,
  changeStep,
  confirm,
};
