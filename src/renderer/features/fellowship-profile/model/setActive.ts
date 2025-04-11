import { combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';
import { reshape } from 'patronum';

import { type BasketTransaction } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { createTxStore } from '@/shared/transactions';
import { memberService } from '@/domains/collectives';
import { basketOperations } from '@/aggregates/basket-operations';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';

import { fellowshipProfileFeature } from './feature';

const flow = createGate<{ isActive: boolean }>({ defaultState: { isActive: false } });

const $isActive = flow.state.map(({ isActive }) => isActive);

const { $api, $chain, $wallet, $wallets, $account } = reshape({
  source: fellowshipProfileFeature.input,
  shape: {
    $api: x => x?.api ?? null,
    $wallet: x => x?.wallet ?? null,
    $account: x => x?.account ?? null,
    $chain: x => x?.chain ?? null,
    $wallets: x => x?.wallets ?? [],
  },
});

const $coreTx = combine(
  {
    input: fellowshipProfileFeature.input,
    account: $account,
    isActive: $isActive,
  },
  ({ input, account, isActive }) => {
    if (nullable(input) || nullable(account)) {
      return null;
    }

    return memberService.createSetActiveTransaction({
      pallet: 'fellowship',
      chain: input.chain,
      account,
      isActive,
    });
  },
);

const { $fee, $wrappedTx, $txWrappers } = createTxStore({
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

sample({
  clock: signModel.output.formSubmitted,
  source: {
    open: flow.status,
    transactions: $wrappedTx,
    account: $account,
    chain: $chain,
  },
  filter: ({ open, transactions, account, chain }) => {
    return open && nonNullable(chain) && nonNullable(transactions) && nonNullable(account);
  },
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
      initiatorAccountId: account.accountId,
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

export const setActive = {
  flow,
  $fee,
  $input: fellowshipProfileFeature.input,
  $wallet,
  $account,
  $wrappedTx,
  $txWrappers,
  sign,
  saveToBasket,
};
