import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { once } from 'patronum';

import { type ChainId, type HexString, TransactionType } from '@shared/core';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { networkModel } from '@entities/network';
import { walletModel, walletUtils } from '@entities/wallet';
import { type SigningPayload } from '../lib/types';

// TODO: Use it for signing
type Input = {
  signingPayloads: SigningPayload[];
};

export type SignatureData = {
  signatures: HexString[];
  txPayloads: Uint8Array[];
};

const formInitiated = createEvent<Input>();
const dataReceived = createEvent<SignatureData>();
const formSubmitted = createEvent<SignatureData>();

const $signStore = createStore<Input | null>(null).reset(formSubmitted);

type SplitParams = {
  input: Input;
  apis: Record<ChainId, ApiPromise>;
};

const splitTxsFx = createEffect(async ({ input, apis }: SplitParams): Promise<Input> => {
  const { signingPayloads } = input;
  const result: SigningPayload[] = [];
  const txsToSplit: SigningPayload[] = [];

  for (const tx of signingPayloads) {
    if (!apis[tx.chain.chainId]) continue;

    if (tx.transaction.type === TransactionType.BATCH_ALL) {
      txsToSplit.push(tx);
    } else {
      result.push(tx);
    }
  }

  const splittedBatches = await Promise.all(
    txsToSplit.map(async (tx) => {
      const txs = await transactionService.splitTxsByWeight(apis[tx.chain.chainId], tx.transaction.args.transactions);

      return txs.map((transactions) => ({
        ...tx,
        transaction: transactionBuilder.buildBatchAll({
          chain: tx.chain,
          accountId: tx.account.accountId,
          transactions,
        }),
      }));
    }),
  );

  result.push(...splittedBatches.flat());

  return {
    signingPayloads: result,
  };
});

const $apis = combine(
  {
    apis: networkModel.$apis,
    store: $signStore,
  },
  ({ apis, store }) => {
    if (!store) return {};

    return store.signingPayloads.reduce<Record<ChainId, ApiPromise>>((acc, payload) => {
      const chainId = payload.chain.chainId;
      const api = apis[chainId];

      if (!api) return acc;

      return {
        ...acc,
        [chainId]: api,
      };
    }, {});
  },
);

const $signerWallet = combine(
  {
    store: $signStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(
      wallets,
      (store.signingPayloads[0].signatory || store.signingPayloads[0].account).walletId,
    );
  },
  { skipVoid: false },
);

sample({
  clock: formInitiated,
  source: networkModel.$apis,
  fn: (apis, input) => ({ input, apis }),
  target: splitTxsFx,
});

sample({
  clock: splitTxsFx.doneData,
  target: $signStore,
});

sample({
  clock: once({ source: dataReceived, reset: formInitiated }),
  target: formSubmitted,
});

export const signModel = {
  $signStore,
  $apis,
  $signerWallet,

  events: {
    formInitiated,
    dataReceived,
  },
  output: {
    formSubmitted,
  },
};
