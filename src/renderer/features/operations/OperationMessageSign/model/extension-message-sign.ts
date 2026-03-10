import { u8aToHex } from '@polkadot/util';
import { getWalletBySource } from '@talismn/connect-wallets';
import { createEffect, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type HexString } from '@/shared/core';
import { assert, toAddress } from '@/shared/lib/utils';
import { polkadotExtensionService } from '@/features/extension-wallet';
import { type MessageSigningPayload } from '../lib/types';

type Step = 'idle' | 'signing' | 'rejected' | 'failed' | 'success';

const flow = createGate<{ payload: MessageSigningPayload | null }>({
  defaultState: { payload: null },
});

const $step = createStore<Step>('idle');
const $signature = createStore<HexString | null>(null).reset(flow.close);

const signRawFx = createEffect(async (payload: MessageSigningPayload) => {
  const { signatory, message } = payload;

  if (!polkadotExtensionService.isExtensionAccount(signatory)) {
    throw new Error('Incorrect account for signing');
  }

  const wallet = getWalletBySource(signatory.extension);
  assert(wallet, 'Wallet not found');

  await wallet.enable('Nova Spektr');

  const signRaw = wallet.signer?.signRaw;
  assert(signRaw, 'Signer not found');

  // @ts-expect-error No types for signRaw method
  const result = await signRaw({
    address: toAddress(signatory.accountId),
    data: u8aToHex(message),
    type: 'bytes',
  });

  return result.signature as HexString;
});

sample({
  clock: flow.open,
  filter: ({ payload }) => payload !== null,
  fn: ({ payload }) => payload!,
  target: signRawFx,
});

sample({
  clock: signRawFx.doneData,
  target: $signature,
});

sample({
  clock: flow.open,
  fn: () => 'signing' as const,
  target: $step,
});

sample({
  clock: signRawFx.fail,
  fn: () => 'rejected' as const,
  target: $step,
});

sample({
  clock: signRawFx.doneData,
  fn: () => 'success' as const,
  target: $step,
});

sample({
  clock: flow.close,
  target: $step.reinit,
});

export const extensionMessageSign = {
  $step,
  $signature,
  flow,
};
