import { combine, createEvent, sample } from 'effector';
import { reshape } from 'patronum';

import { type BasketTransaction } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { createTxStore } from '@/shared/transactions';
import { evidenceService } from '@/domains/collectives';
import { basketOperations } from '@/aggregates/basket-operations';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';

import { evidenceForm } from './evidenceForm';
import { fellowshipSalaryFeature } from './feature';

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
    wish: evidenceForm.$wish,
    evidence: evidenceForm.$evidence,
  },
  ({ input, account, wish, evidence }) => {
    if (nullable(input) || nullable(account) || nullable(wish) || nullable(evidence)) {
      return null;
    }

    return evidenceService.createEvidenceTransaction({
      pallet: 'fellowship',
      chain: input.chain,
      account,
      wish,
      evidence,
    });
  },
);

const { $fee, $wrappedTx, $txWrappers } = createTxStore({
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

sample({
  clock: signModel.output.formSubmitted,
  source: {
    transactions: $wrappedTx,
    account: $account,
    chain: $chain,
  },
  filter: ({ transactions, account, chain }) => nonNullable(chain) && nonNullable(transactions) && nonNullable(account),
  fn({ transactions, account, chain }, signParams) {
    return {
      signatures: signParams.signatures,
      txPayloads: signParams.txPayloads,

      chain: chain!,
      account: account!,
      wrappedTxs: [transactions!.wrappedTx],
      coreTxs: [transactions!.coreTx],
      multisigTxs: transactions!.multisigTx ? [transactions!.multisigTx] : [],
    };
  },
  target: submitModel.events.formInitiated,
});

// Basket

const saveToBasket = createEvent();
const basketSaveRequestCreated = createEvent<BasketTransaction | null>();

sample({
  clock: saveToBasket,
  source: {
    transactions: $wrappedTx,
    account: $account,
    txWrappers: $txWrappers,
  },
  fn: ({ account, transactions, txWrappers }) => {
    if (nullable(account) || nullable(transactions)) {
      return null;
    }

    // @ts-expect-error TODO fix id field
    const tx: BasketTransaction = {
      initiatorWallet: account.walletId,
      coreTx: transactions.coreTx,
      txWrappers,
    };

    return tx;
  },
  target: basketSaveRequestCreated,
});

sample({
  clock: basketSaveRequestCreated.filter({ fn: nonNullable }),
  fn: tx => [tx],
  target: basketOperations.addTransactions,
});

export const evidencePost = {
  $fee,
  $wallet,
  $account,
  $wrappedTx,
  $txWrappers,
  sign,
  saveToBasket,
};
