import { combine, createEvent, restore, sample } from 'effector';
import { reshape } from 'patronum';

import { createFlow } from '@/shared/effector';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { createTxStore } from '@/shared/transactions';
import { evidence, evidenceService } from '@/domains/collectives';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';

import { evidenceForm } from './evidenceForm';
import { fellowshipEvidenceFeature } from './feature';

const flow = createFlow(null);

const { $api, $chain, $wallet, $wallets, $account } = reshape({
  source: fellowshipEvidenceFeature.input,
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
    input: fellowshipEvidenceFeature.input,
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
    };
  },
  target: submitModel.events.formInitiated,
});

const evidenceReqiested = sample({
  clock: submitModel.output.formSubmitted,
  source: {
    api: $api,
    account: $account,
    chain: $chain,
  },
  filter: ({ api, account, chain }) => {
    return nonNullable(api) && nonNullable(account) && nonNullable(chain?.chainId);
  },
  fn({ api, account, chain }) {
    if (nullable(api) || nullable(account) || nullable(chain)) return null;
    return { api, account, chain };
  },
});

sample({
  clock: evidenceReqiested.filter({ fn: nonNullable }),
  fn({ api, account, chain }) {
    return {
      palletType: 'fellowship' as const,
      api,
      chainId: chain.chainId,
      accounts: [account.accountId],
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

export const evidencePost = {
  flow,
  $fee,
  $step,
  $wallet,
  $account,
  $wrappedTx,
  sign,
  saveToBasket,
  setStep,
};
