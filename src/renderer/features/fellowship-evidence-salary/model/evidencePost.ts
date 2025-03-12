import { combine, createEvent, restore, sample } from 'effector';
import { reshape } from 'patronum';

import { type BasketTransaction } from '@/shared/core';
import { createFlow } from '@/shared/effector';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { createTxStore } from '@/shared/transactions';
import { evidence, evidenceService } from '@/domains/collectives';
import { basketOperations } from '@/aggregates/basket-operations';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';

import { evidenceForm } from './evidenceForm';
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

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    transactions: $wrappedTx,
    api: $api,
    account: $account,
    chain: $chain,
  },
  fn({ api, account, chain }) {
    return {
      palletType: 'fellowship' as const,
      api: api!,
      chain: chain!,
      accountId: account!.accountId,
    };
  },
  target: evidence.request,
});

// Steps

const setStep = createEvent<'closed' | 'form' | 'submit'>();
const $step = restore(setStep, 'closed');

sample({
  clock: evidenceForm.evidenceUploaded,
  fn: () => 'submit' as const,
  target: $step,
});

sample({
  clock: $step,
  filter: step => step === 'closed',
  target: evidenceForm.reset,
});

// Basket

const saveToBasket = createEvent();

const basketSaveRequestCreated = sample({
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
});

sample({
  clock: basketSaveRequestCreated.filter({ fn: nonNullable }),
  fn: tx => [tx],
  target: basketOperations.addTransactions,
});

export const evidencePost = {
  flow,
  $fee,
  $step,
  $wallet,
  $account,
  $wrappedTx,
  $txWrappers,
  sign,
  saveToBasket,
  setStep,
};
