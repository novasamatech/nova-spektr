import { getWalletBySource } from '@talismn/connect-wallets';
import { attach, createEffect, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type HexString } from '@/shared/core';
import { series } from '@/shared/effector';
import { assert, createTxMetadata, upgradeNonce } from '@/shared/lib/utils';
import { transactionService } from '@/entities/transaction';
import { polkadotExtensionService } from '@/features/extension-wallet';
import { type ExtrinsicSigningPayload } from '../lib/types';

type Step = 'idle' | 'signing' | 'rejected' | 'failed' | 'success';

const PJS_EXTENSION_SIGN_RATE_LIMIT = 3000;

export type SignResponse = {
  signature: HexString;
  signedTransaction?: Uint8Array | HexString;
  txPayload: ReturnType<typeof transactionService.createPayloadWithMetadata>;
};

const flow = createGate<{
  payloads: ExtrinsicSigningPayload[];
  signatory: ExtrinsicSigningPayload['signatory'] | null;
}>({
  defaultState: { payloads: [], signatory: null },
});

const $step = createStore<Step>('idle');
const $signed = createStore<SignResponse[]>([]).reset(flow.close);

const $signatory = flow.state.map(({ signatory }) => signatory);
const $transactions = createStore<ReturnType<typeof transactionService.createPayloadWithMetadata>[]>([]);
const $signingTotal = createStore<number>(0).reset(flow.close);
const $signingCurrent = createStore<number>(0).reset(flow.close);

const setupTransactionFx = createEffect(
  async (
    payloads: ExtrinsicSigningPayload[],
  ): Promise<ReturnType<typeof transactionService.createPayloadWithMetadata>[]> => {
    const payload = payloads.at(0);
    assert(payload, "Can't prepare empty payload");

    const signatory = payload.signatory;

    let metadata = await createTxMetadata(signatory.accountId, payload.api);

    const transactions: ReturnType<typeof transactionService.createPayloadWithMetadata>[] = [];

    for (const { api, extrinsic } of payloads) {
      const txPayload = transactionService.createPayloadWithMetadata(extrinsic, api, metadata);
      transactions.push(txPayload);
      metadata = upgradeNonce(metadata, 1);
    }

    transactionService.logPayload(transactions);

    return transactions;
  },
);

const signFx = attach({
  source: $signatory,
  async effect(
    signatory,
    { txPayload }: { txPayload: ReturnType<typeof transactionService.createPayloadWithMetadata> },
  ) {
    assert(signatory, 'Signatory is required');
    if (!polkadotExtensionService.isExtensionAccount(signatory)) {
      throw new Error('Incorrect account for signing');
    }

    const wallet = getWalletBySource(signatory.extension);
    assert(wallet, 'Wallet not found');

    // Init connection
    await wallet.enable('Nova Spektr');
    // Method for signing
    const signPayload = wallet?.signer?.signPayload;
    assert(signPayload, 'Signer not found');

    // @ts-expect-error No types for signPayload method
    const { signature, signedTransaction } = await signPayload(txPayload.unsigned);

    if (polkadotExtensionService.isPolkadotExtensionAccount(signatory)) {
      await new Promise((resolve) => setTimeout(resolve, PJS_EXTENSION_SIGN_RATE_LIMIT));
    }

    return {
      signature,
      signedTransaction,
      txPayload: txPayload,
    };
  },
});

const signWithProgressFx = createEffect(
  async (params: {
    txPayload: ReturnType<typeof transactionService.createPayloadWithMetadata>;
    index: number;
  }): Promise<SignResponse> => {
    return signFx(params);
  },
);

const signAllFx = series(signWithProgressFx);

sample({
  clock: setupTransactionFx.doneData,
  target: $transactions,
});

sample({
  clock: flow.close,
  target: $transactions.reinit,
});

sample({
  clock: flow.open,
  filter: ({ payloads }) => payloads.length > 0,
  fn: ({ payloads }) => payloads,
  target: setupTransactionFx,
});

sample({
  clock: setupTransactionFx.doneData,
  fn: (transactions) => transactions.length,
  target: $signingTotal,
});

sample({
  clock: setupTransactionFx.doneData,
  fn: () => 0,
  target: $signingCurrent,
});

sample({
  clock: setupTransactionFx.doneData,
  fn: (transactions) =>
    transactions.map((txPayload, index) => ({
      txPayload,
      index: index + 1,
    })),
  target: signAllFx,
});

sample({
  clock: signWithProgressFx,
  fn: ({ index }) => index,
  target: $signingCurrent,
});

sample({
  clock: signAllFx.doneData,
  target: $signed,
});

// Steps

sample({
  clock: flow.open,
  fn: () => 'signing' as const,
  target: $step,
});

sample({
  clock: signAllFx.fail,
  fn: () => 'rejected' as const,
  target: $step,
});

sample({
  clock: signAllFx.fail,
  fn: () => 'failed' as const,
  target: $step,
});

sample({
  clock: signAllFx.done,
  fn: () => 'success' as const,
  target: $step,
});

sample({
  clock: flow.close,
  target: $step.reinit,
});

export const polkadotExtensionSign = {
  $step,
  $signed,
  $signingCurrent,
  $signingTotal,
  flow,
};
