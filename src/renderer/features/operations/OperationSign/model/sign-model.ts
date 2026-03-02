import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { once } from 'patronum';

import { type ChainId, type HexString } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Extrinsic, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { getExtrinsic } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type ExtrinsicSigningPayload, type SigningPayload, type TransactionSigningPayload } from '../lib/types';

type DeprecatedInput = {
  signingPayloads: SigningPayload[];
};

export type DeprecatedSignatureData = {
  signatures: HexString[];
  txPayloads: Uint8Array[];
};

export type SignatureResult = {
  api: ApiPromise;
  signatory: AccountId;
  extrinsic: Extrinsic;
  signature: HexString;
  payload: Uint8Array;
};

const flow = createGate();

/**
 * Filling sign store
 */
const init = createEvent<TransactionSigningPayload[]>();
/**
 * Signator component indicates that payload is signed
 */
const signed = createEvent<SignatureResult[]>();

const $signStore = createStore<ExtrinsicSigningPayload[] | null>(null).reset([init, flow.close]);

/**
 * @deprecated Use "init" instead
 */
const formInitiated = createEvent<DeprecatedInput>();
/**
 * @deprecated Use signed instead.
 */
const formSubmitted = createEvent<DeprecatedSignatureData>();

type ConvertParams = {
  input: DeprecatedInput;
  apis: Record<ChainId, ApiPromise>;
};

const convertOldFormatToNewFx = createEffect(({ input, apis }: ConvertParams) => {
  const { signingPayloads } = input;
  const converted = signingPayloads.map<TransactionSigningPayload>(({ transaction, account, signatory, chain }) => {
    const api = apis[chain.chainId]!;
    const extrinsic = getExtrinsic[transaction.type](transaction.args, api);
    return {
      api,
      chain,
      transaction: transactionService.createEncodedTransactionFromExtrinsic(extrinsic),
      signatory: signatory ?? account,
    };
  });

  return converted;
});

/**
 * Some batch extrinsics can be too large for network. in this case we're
 * splitting them into multiple chunks.
 */
const splitExtrinsicsFx = createEffect(async (input: TransactionSigningPayload[]) => {
  let splitted: ExtrinsicSigningPayload[] = [];

  console.group('[SpektrVaultDebug] Stage 1: Creating & splitting extrinsics');
  console.log('Input transactions:', input.map(({ transaction, signatory, chain }) => ({
    transaction,
    signatory: signatory.accountId,
    chain: chain.name,
    chainId: chain.chainId,
  })));

  for (const { api, chain, signatory, transaction } of input) {
    const extrinsic = transactionService.createExtrinsic(transaction, api);

    console.group(`[SpektrVaultDebug] Extrinsic: ${extrinsic.method.section}.${extrinsic.method.method}`);
    console.log('callData (hex):', extrinsic.method.toHex());
    console.log('human args:', extrinsic.method.toHuman());
    console.log('signatory:', signatory.accountId);
    console.groupEnd();

    const extrinsics = await transactionService.splitExtrinsic(extrinsic, api);
    if (extrinsics.length > 1) {
      console.log(`[SpektrVaultDebug] Batch split into ${extrinsics.length} chunks`);
    }

    splitted = splitted.concat(
      extrinsics.map((extrinsic) => ({
        extrinsic,
        signatory,
        chain,
        api,
      })),
    );
  }

  console.log('[SpektrVaultDebug] Total extrinsics to sign:', splitted.length);
  console.groupEnd();

  return splitted;
});

const $signerWallet = combine(
  {
    store: $signStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (nullable(store)) return null;
    const payload = store.at(0);
    if (nullable(payload)) return null;

    return walletUtils.getWalletById(wallets, payload.signatory.walletId);
  },
);

// deprecated format handling

sample({
  clock: formInitiated,
  source: networkModel.$apis,
  filter: (_, { signingPayloads }) => signingPayloads.length > 0,
  fn: (apis, input) => ({ input, apis }),
  target: convertOldFormatToNewFx,
});

sample({
  clock: convertOldFormatToNewFx.doneData,
  target: init,
});

// actual flow

sample({
  clock: init,
  filter: (payloads) => payloads.length > 0,
  target: splitExtrinsicsFx,
});

sample({
  clock: splitExtrinsicsFx.doneData,
  target: $signStore,
});

sample({
  clock: once({ source: signed, reset: init }),
  target: signed,
});

// deprecated event

sample({
  clock: once({ source: signed, reset: init }),
  fn(data) {
    return {
      signatures: data.map((d) => d.signature),
      txPayloads: data.map((d) => d.payload),
    };
  },
  target: formSubmitted,
});

export const signModel = {
  $signStore,
  $signerWallet,

  init,
  signed,

  events: {
    /**
     * @deprecated Use signModel.init instead. New method requires
     *   AnyTransaction type in tx.
     */
    formInitiated,
  },
  output: {
    /**
     * @deprecated Use signModel.signed instead
     */
    formSubmitted,
  },
  gates: {
    flow,
  },
};
