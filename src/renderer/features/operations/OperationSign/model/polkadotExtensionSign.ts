import { type ApiPromise } from '@polkadot/api';
import { web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import { createEffect, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId, type HexString } from '@/shared/core';
import { series } from '@/shared/effector';
import { assert, createTxMetadata, toAddress } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { type SigningPayload } from '../lib/types';

type Step = 'idle' | 'signing' | 'rejected' | 'failed' | 'success';

export type SignResponse = {
  signature: HexString;
  txPayload: ReturnType<typeof transactionService.createPayloadWithMetadata>;
};

const flow = createGate<{ payloads: SigningPayload[] }>({ defaultState: { payloads: [] } });

const $step = createStore<Step>('idle');
const $signed = createStore<SignResponse[]>([]).reset(flow.close);

type SetupParams = {
  payload: SigningPayload;
  apis: Record<ChainId, ApiPromise>;
};

const signFx = createEffect(async ({ payload, apis }: SetupParams): Promise<SignResponse> => {
  const api = apis[payload.transaction.chainId];
  const account = payload.signatory || payload.account;
  assert(api, `Api from chain ${payload.transaction.chainId} not found.`);
  assert(account, 'Signing account not found');

  const address = toAddress(account.accountId, { prefix: payload.chain.addressPrefix });
  const metadata = await createTxMetadata(address, api);

  const txPayload = transactionService.createPayloadWithMetadata(payload.transaction, api, metadata);

  transactionService.logPayload([txPayload]);

  // Init connection
  await web3Enable('Nova Spektr');
  // Fetching actual account injector
  const injector = await web3FromAddress(address);
  // Method for signing
  const signPayload = injector?.signer?.signPayload;
  assert(signPayload, 'Signer not found');

  const { signature } = await signPayload(txPayload.unsigned);

  return {
    signature,
    txPayload: txPayload,
  };
});

const signAllFx = series(signFx);

sample({
  clock: flow.open,
  source: networkModel.$apis,
  fn: (apis, { payloads }) => {
    return payloads.map((payload) => ({
      payload,
      apis,
    }));
  },
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
