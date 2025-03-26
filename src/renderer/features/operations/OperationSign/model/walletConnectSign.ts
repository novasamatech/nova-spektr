import { type ApiPromise } from '@polkadot/api';
import { type SignerPayloadJSON } from '@polkadot/types/types';
import { type SessionTypes } from '@walletconnect/types';
import { attach, createEffect, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { combineEvents } from 'patronum';

import { type ChainId, type HexString } from '@/shared/core';
import { series } from '@/shared/effector';
import { assert, createTxMetadata, nonNullable, upgradeNonce } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { DEFAULT_POLKADOT_METHODS, walletConnect, walletConnectService } from '@/features/wallet-connect-wallet';
import { type SigningPayload } from '../lib/types';

type Step = 'idle' | 'signing' | 'rejected' | 'failed' | 'success';

type SignResponse = {
  signature: HexString;
};

const flow = createGate<{ payloads: SigningPayload[] }>({ defaultState: { payloads: [] } });

const $signingPayloads = flow.state.map(({ payloads }) => payloads);
const $transactions = createStore<ReturnType<typeof transactionService.createPayloadWithMetadata>[]>([]);
const $step = createStore<Step>('idle');
const $signed = createStore<SignResponse[]>([]).reset(flow.close);

const gotFirstPayload = $signingPayloads.updates.map((payloads) => payloads.at(0)).filter({ fn: nonNullable });

type SetupParams = {
  payloads: SigningPayload[];
  apis: Record<ChainId, ApiPromise>;
};

const setupTransactionFx = createEffect(async ({ payloads, apis }: SetupParams) => {
  const payload = payloads.at(0);
  assert(payload, "Can't prepare empty payload");

  const account = payload.signatory || payload.account;
  const api = apis[payload.chain.chainId];

  let metadata = await createTxMetadata(account.accountId, api);

  const result: ReturnType<typeof transactionService.createPayloadWithMetadata>[] = [];

  for (const { transaction } of payloads) {
    const payload = transactionService.createPayloadWithMetadata(transaction, api, metadata);
    result.push(payload);
    metadata = upgradeNonce(metadata, 1);
  }

  transactionService.logPayload(result);

  return result;
});

const getSessionFx = attach({ effect: walletConnect.restoreSession });

type SignParams = {
  session: SessionTypes.Struct;
  payload: SignerPayloadJSON;
};

const signFx = attach({
  source: walletConnect.$client,
  async effect(client, { payload, session }: SignParams) {
    assert(client, 'Wallet Connect client not found.');

    const response = await walletConnect.request({
      client,
      session,
      chainId: walletConnectService.getWalletConnectChainId(payload.genesisHash),
      request: {
        method: DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_TRANSACTION,
        params: {
          address: payload.address,
          transactionPayload: payload,
        },
      },
    });

    return response as SignResponse;
  },
});

const signAllFx = series(signFx);

// Storing transaction data

sample({
  clock: setupTransactionFx.doneData,
  target: $transactions,
});

sample({
  clock: flow.close,
  target: $transactions.reinit,
});

// Steps

sample({
  clock: flow.open,
  fn: () => 'signing' as const,
  target: $step,
});

sample({
  clock: getSessionFx.fail,
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

// Main signing flow

sample({
  clock: gotFirstPayload,
  source: networkModel.$chains,
  fn: (chains, { account, signatory }) => {
    // TODO remove this hardcode
    const ac = signatory || account;

    return {
      pairingTopic: walletConnectService.isWalletConnectAccount(ac) ? ac.signingExtras.pairingTopic : undefined,
      chains: Object.values(chains).map((c) => c.chainId),
    };
  },
  target: getSessionFx,
});

sample({
  clock: $signingPayloads,
  source: networkModel.$apis,
  filter: (_, payloads) => payloads.length > 0,
  fn: (apis, payloads) => ({ apis, payloads }),
  target: setupTransactionFx,
});

const readyToSign = combineEvents({
  events: {
    session: getSessionFx.doneData,
    transactions: setupTransactionFx.doneData,
  },
  reset: flow.close,
});

sample({
  clock: readyToSign,
  source: walletConnect.$client,
  filter: nonNullable,
  fn(client, { transactions, session }) {
    assert(client, 'WC client not found');

    return transactions.map<SignParams>(({ unsigned }) => ({
      client,
      session,
      payload: unsigned,
    }));
  },
  target: signAllFx,
});

sample({
  clock: signAllFx.doneData,
  target: $signed,
});

export const walletConnectSign = {
  $pairingUri: walletConnect.$pairingUri,
  $transactions,
  $step,
  $signed,
  flow,
};
