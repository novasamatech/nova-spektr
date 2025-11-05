import { combine, createEvent, sample } from 'effector';
import { reshape } from 'patronum';

import { createFlow } from '@/shared/effector';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { createTxStore } from '@/shared/transactions';
import { salaryService } from '@/domains/collectives';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';

import { fellowshipSalaryFeature } from './feature';

const flow = createFlow(null);

const { $api, $chain, $wallet, $wallets, $account } = reshape({
  source: fellowshipSalaryFeature.input,
  shape: {
    $api: x => x?.api ?? null,
    $wallets: x => x?.wallets ?? [],
    $wallet: x => x?.wallet ?? null,
    $account: x => x?.account ?? null,
    $chain: x => x?.chain ?? null,
  },
});

const $coreTx = combine(
  {
    input: fellowshipSalaryFeature.input,
    account: $account,
  },
  ({ input, account }) => {
    if (nullable(input) || nullable(account)) {
      return null;
    }

    return salaryService.createSalaryInductTransaction({
      pallet: 'fellowship',
      chain: input.chain,
      account,
    });
  },
);

const { $fee, $wrappedTx } = createTxStore({
  $active: flow.status,
  $api,
  $activeWallet: $wallet,
  $wallets,
  $chain,
  $coreTx,
  $account,
});

// Signing

const sign = createEvent();
const signPayloadCreated = createEvent<SigningPayload | null>();

sample({
  clock: sign,
  source: {
    transactions: $wrappedTx,
    account: $account,
    chain: $chain,
  },
  fn: ({ transactions, account, chain }) => {
    if (nullable(transactions) || nullable(account) || nullable(chain)) {
      return null;
    }

    return {
      chain,
      account,
      transaction: transactions.wrappedTx,
      signatory: null,
    };
  },
  target: signPayloadCreated,
});

sample({
  clock: signPayloadCreated.filter({ fn: nonNullable }),
  fn: payload => ({ signingPayloads: [payload] }),
  target: signModel.events.formInitiated,
});

const transactionSigned = sample({
  clock: signModel.output.formSubmitted,
  source: {
    open: flow.status,
    transactions: $wrappedTx,
    account: $account,
    chain: $chain,
  },
  fn({ open, account, chain, transactions }, signParams) {
    return { open, account, chain, transactions, signParams };
  },
}).filterMap(({ open, account, chain, transactions, signParams }) => {
  if (open && nonNullable(chain) && nonNullable(transactions) && nonNullable(account)) {
    return { account, chain, transactions, signParams };
  }
});

sample({
  clock: transactionSigned,
  fn({ transactions, account, chain, signParams }) {
    return {
      signatures: signParams.signatures,
      txPayloads: signParams.txPayloads,

      chain: chain,
      account: account,
      wrappedTxs: [transactions!.wrappedTx],
      coreTxs: [transactions!.coreTx],
    };
  },
  target: submitModel.events.formInitiated,
});

// Basket

const saveToBasket = createEvent();

sample({
  clock: saveToBasket,
  source: $wrappedTx,
  fn: transactions => {
    if (nullable(transactions)) {
      return [];
    }

    const tx: BasketTransactionDraft = {
      initiatorAccountId: transactions.coreTx.accountId,
      coreTx: transactions.coreTx,
      route: [],
      createdAt: Date.now(),
    };

    return [tx];
  },
  target: basketOperations.addTransactions,
});

export const salaryInduct = {
  flow,
  $fee,
  $wallet,
  $account,
  $wrappedTx,
  sign,
  saveToBasket,
};
