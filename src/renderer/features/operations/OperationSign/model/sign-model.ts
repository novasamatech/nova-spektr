import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { once } from 'patronum';

import { type Chain, type ChainId, type HexString } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type OperationBlockReason } from '@/shared/transactions';
import { type Extrinsic, ExtrinsicTooHeavyError, transactionService } from '@/domains/network';
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

export type BatchSplitWarning = {
  wasSplit: true;
  payloadCountBeforeSplit: number;
  extrinsicCountAfterSplit: number;
};

/**
 * Filling sign store
 */
const init = createEvent<TransactionSigningPayload[]>();
/**
 * Signator component indicates that payload is signed
 */
const signed = createEvent<SignatureResult[]>();

const $signStore = createStore<ExtrinsicSigningPayload[] | null>(null).reset([init, flow.close]);

const $payloadCountBeforeSplit = createStore<number>(0).reset([init, flow.close]);

const $batchSplitWarning = createStore<BatchSplitWarning | null>(null).reset([init, flow.close]);

export type SignBlocked = {
  reason: OperationBlockReason;
  chain: Chain | null;
};

/**
 * Why the payloads cannot be signed at all; `null` while signing can proceed.
 * Set instead of `$signStore` when a call cannot be encoded at all, or is too
 * heavy to fit into one extrinsic and cannot be split.
 */
const $blocked = createStore<SignBlocked | null>(null).reset([init, flow.close]);

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
 * Encodes every payload into an extrinsic. Kept apart from the split so an
 * encoding failure (the call itself is unusable) is not mistaken for a split
 * failure (the node did not answer).
 */
const encodeExtrinsicsFx = createEffect((input: TransactionSigningPayload[]): ExtrinsicSigningPayload[] => {
  return input.map(({ api, chain, signatory, transaction }) => ({
    api,
    chain,
    signatory,
    extrinsic: transactionService.createExtrinsic(transaction, api),
  }));
});

/**
 * Some batch extrinsics can be too large for network. in this case we're
 * splitting them into multiple chunks.
 */
const splitExtrinsicsFx = createEffect(async (input: ExtrinsicSigningPayload[]) => {
  let splitted: ExtrinsicSigningPayload[] = [];

  for (const { api, chain, signatory, extrinsic } of input) {
    const extrinsics = await transactionService.splitExtrinsic(extrinsic, api);

    splitted = splitted.concat(
      extrinsics.map((extrinsic) => ({
        extrinsic,
        signatory,
        chain,
        api,
      })),
    );
  }

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

    return walletUtils.getWalletById(wallets, payload.signatory.walletId) ?? null;
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
  fn: (payloads) => payloads.length,
  target: $payloadCountBeforeSplit,
});

sample({
  clock: init,
  filter: (payloads) => payloads.length > 0,
  target: encodeExtrinsicsFx,
});

sample({
  clock: encodeExtrinsicsFx.doneData,
  target: splitExtrinsicsFx,
});

sample({
  clock: splitExtrinsicsFx.doneData,
  target: $signStore,
});

// A call that cannot be encoded has no hash either, so the confirm step could
// not check it against pending multisig operations (see
// `createTransactionConfirmStore`) — signing is where it is refused. Both
// encoding paths land here: the deprecated form conversion and the extrinsic
// encoding of the current one.
sample({
  clock: [
    convertOldFormatToNewFx.fail.map(({ params, error }) => ({
      chain: params.input.signingPayloads.at(0)?.chain ?? null,
      error,
    })),
    encodeExtrinsicsFx.fail.map(({ params, error }) => ({ chain: params.at(0)?.chain ?? null, error })),
  ],
  fn: ({ chain, error }): SignBlocked => ({
    reason: { kind: 'call-hash-unavailable', detail: error.message },
    chain,
  }),
  target: $blocked,
});

sample({
  clock: splitExtrinsicsFx.fail,
  filter: ({ error }) => error instanceof ExtrinsicTooHeavyError,
  fn: ({ params, error }): SignBlocked => ({
    reason: { kind: 'extrinsic-too-heavy', detail: error.message },
    chain: params.at(0)?.chain ?? null,
  }),
  target: $blocked,
});

sample({
  clock: splitExtrinsicsFx.doneData,
  source: $payloadCountBeforeSplit,
  fn: (payloadCountBeforeSplit, extrinsicsAfterSplit) => {
    if (extrinsicsAfterSplit.length > payloadCountBeforeSplit) {
      return {
        wasSplit: true as const,
        payloadCountBeforeSplit,
        extrinsicCountAfterSplit: extrinsicsAfterSplit.length,
      };
    }
    return null;
  },
  target: $batchSplitWarning,
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
  $batchSplitWarning,
  $blocked,

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
