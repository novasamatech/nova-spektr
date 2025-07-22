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
import { type ExtrinsicSigningPayload, type SigningPayload } from '../lib/types';

type DeprecatedInput = {
  signingPayloads: SigningPayload[];
};

type Input = ExtrinsicSigningPayload[];

export type DeprecatedSignatureData = {
  extrinsics: Extrinsic[];
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
const init = createEvent<Input>();
/**
 * Signator component indicates that payload is signed
 */
const signed = createEvent<SignatureResult[]>();

const $signStore = createStore<Input | null>(null).reset([init, flow.close]);

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

/**
 * Some batch extrinsics can be too large for network. in this case we're
 * splitting them into multiple chunks.
 */
const convertOldFormatToNewFx = createEffect(({ input, apis }: ConvertParams): Input => {
  const { signingPayloads } = input;
  const converted = signingPayloads.map<ExtrinsicSigningPayload>(({ transaction, account, signatory, chain }) => {
    const api = apis[chain.chainId];
    return {
      api,
      chain,
      signatory: signatory ?? account,
      extrinsic: getExtrinsic[transaction.type](transaction.args, api),
    };
  });

  return converted;
});

/**
 * Some batch extrinsics can be too large for network. in this case we're
 * splitting them into multiple chunks.
 */
const splitExtrinsicsFx = createEffect(async (input: Input): Promise<Input> => {
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

const $apis = $signStore.map((store) => {
  if (nullable(store)) return {};
  return store.reduce<Record<ChainId, ApiPromise>>((acc, payload) => {
    const chainId = payload.api.genesisHash.toHex();
    return {
      ...acc,
      [chainId]: payload.api,
    };
  }, {});
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
      extrinsics: data.map((d) => d.extrinsic),
      signatures: data.map((d) => d.signature),
      txPayloads: data.map((d) => d.payload),
    };
  },
  target: formSubmitted,
});

export const signModel = {
  $signStore,
  $apis,
  $signerWallet,

  events: {
    /**
     * @deprecated Use signModel.events.init instead
     */
    formInitiated,
    init,
    signed,
  },
  output: {
    /**
     * @deprecated Use signModel.events.signed instead
     */
    formSubmitted,
  },
  gates: {
    flow,
  },
};
