import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type BasketTransaction, basketOperations } from '@/aggregates/basket-operations';
import { signModel } from '@/features/operations/OperationSign';
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';
import { signOperationsUtils } from '../service/sign-operations-utils';
import { Step } from '../types';

import { validation } from './validation';

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
  clock: startFlow,
  fn: ({ transactions }) => transactions.map(transaction => ({ transaction })),
  target: validation.validateTransactions,
});

sample({
  clock: confirm,
  source: {
    transactions: $transactions,
    chains: networkModel.$chains,
    accounts: accounts.$list,
  },
  filter: ({ transactions }) => nonNullable(transactions) && transactions.length > 0,
  fn: ({ transactions, accounts, chains }) => {
    // TODO implement wrapping in basket context. Now basket only supports PV so it's not necessary.
    const signingPayloads = transactions
      .map(tx => {
        const account = accounts.find(a => a.accountId === tx.initiatorAccountId);
        const chain = chains[tx.coreTx.chainId];
        if (nullable(account) || nullable(chain)) return null;

        return {
          chain,
          account,
          transaction: tx.coreTx,
          signatory: null,
        };
      })
      .filter(nonNullable);

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
  filter: ({ transactions }) => nonNullable(transactions) && transactions.length > 0,
  fn: ({ transactions, chains, wallets }, signParams) => {
    const account = walletUtils.getAccountsBy(wallets, account => {
      return (
        account.accountId === transactions[0].initiatorAccountId &&
        account.accountId === transactions[0].coreTx.accountId
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
            message: result.params,
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
