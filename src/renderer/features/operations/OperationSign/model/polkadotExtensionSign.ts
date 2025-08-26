import { getWalletBySource } from '@talismn/connect-wallets';
import { createEffect, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type HexString } from '@/shared/core';
import { series } from '@/shared/effector';
import { assert, createTxMetadata } from '@/shared/lib/utils';
import { transactionService } from '@/entities/transaction';
import { polkadotExtensionService } from '@/features/extension-wallet';
import { type ExtrinsicSigningPayload } from '../lib/types';

type Step = 'idle' | 'signing' | 'rejected' | 'failed' | 'success';

export type SignResponse = {
  signature: HexString;
  txPayload: ReturnType<typeof transactionService.createPayloadWithMetadata>;
};

const flow = createGate<{ payloads: ExtrinsicSigningPayload[] }>({ defaultState: { payloads: [] } });

const $step = createStore<Step>('idle');
const $signed = createStore<SignResponse[]>([]).reset(flow.close);

const signFx = createEffect(async ({ api, extrinsic, signatory }: ExtrinsicSigningPayload): Promise<SignResponse> => {
  if (!polkadotExtensionService.isExtensionAccount(signatory)) {
    throw new Error('Incorrect account for signing');
  }

  const wallet = getWalletBySource(signatory.extension);
  assert(wallet, 'Wallet not found');

  const metadata = await createTxMetadata(signatory.accountId, api);
  const txPayload = transactionService.createPayloadWithMetadata(extrinsic, api, metadata);

  transactionService.logPayload([txPayload]);

  // Init connection
  await wallet.enable('Nova Spektr');
  // Method for signing
  const signPayload = wallet?.signer?.signPayload;
  assert(signPayload, 'Signer not found');

  // @ts-expect-error No types for signPayload method
  const { signature } = await signPayload(txPayload.unsigned);

  return {
    signature,
    txPayload: txPayload,
  };
});

const signAllFx = series(signFx);

sample({
  clock: flow.open,
  fn: ({ payloads }) => payloads,
  target: signAllFx,
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
  flow,
};
