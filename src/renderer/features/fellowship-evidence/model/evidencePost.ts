import { combine, createEvent, createStore, restore, sample } from 'effector';
import { reshape } from 'patronum';

import { createFlow } from '@/shared/effector';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { createTxStore } from '@/shared/transactions';
import { evidenceService } from '@/domains/collectives';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { type SigningPayload, signModel } from '@/features/operations/OperationSign';
import { submitModel } from '@/features/operations/OperationSubmit';

import { evidenceForm } from './evidenceForm';
import { evidenceIPFS } from './evidenceIPFS';
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
    fromScratchEvidence: evidenceForm.$evidence,
    ipfsEvidence: evidenceIPFS.$evidence,
    flowType: evidenceForm.$flowType,
  },
  ({ input, account, wish, fromScratchEvidence, ipfsEvidence, flowType }) => {
    const evidence = flowType === 'ipfsUpload' ? ipfsEvidence : fromScratchEvidence;

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

// Steps

const setStep = createEvent<'closed' | 'form' | 'submit'>();
const $step = restore(setStep, 'closed');

const openSubmitModal = createEvent();
const closeSubmitModal = createEvent();
const $submitModalOpen = createStore(false);

sample({
  clock: openSubmitModal,
  fn: () => true,
  target: $submitModalOpen,
});

sample({
  clock: closeSubmitModal,
  fn: () => false,
  target: $submitModalOpen,
});

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

sample({
  clock: evidenceIPFS.uploadFileToIPFS.done,
  source: {
    ipfsStep: evidenceIPFS.$step,
    flowType: evidenceForm.$flowType,
  },
  filter: ({ ipfsStep, flowType }) => ipfsStep === 'preview' && flowType === 'ipfsUpload',
  target: openSubmitModal,
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
  $submitModalOpen,
  $wallet,
  $account,
  $wrappedTx,
  sign,
  saveToBasket,
  setStep,
  openSubmitModal,
  closeSubmitModal,
};
