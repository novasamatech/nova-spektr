import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { once } from 'patronum';

import { type Chain, type HexString, type Transaction, TransactionType } from '@/shared/core';
import { assert, nonNullable, removeFromCollection } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type Extrinsic } from '@/domains/network';
import { networkModel } from '@/entities/network';
import {
  type ExtrinsicResultParams,
  getExtrinsic,
  transactionBuilder,
  transactionService,
} from '@/entities/transaction';
import { ExtrinsicResult, SubmitStep } from '../lib/types';

type SubmitPayload = {
  signatory: AccountId;
  payload: Uint8Array;
  signature: HexString;
  extrinsic: Extrinsic;
};

export type SubmitInputDeprecated = {
  chain: Chain;
  account: AnyAccount;
  coreTxs: Transaction[];
  wrappedTxs: Transaction[];

  signatures: HexString[];
  txPayloads: Uint8Array[];
};

export type SubmitInput = {
  api: ApiPromise;
  payloads: SubmitPayload[];
};

type Result = { id: number; result: ExtrinsicResult; params: ExtrinsicResultParams | string };

/**
 * Flow entry point
 *
 * @deperecated use "start" event instead
 */
const formInitiated = createEvent<SubmitInputDeprecated>();
/**
 * Flow entry point
 */
const start = createEvent<SubmitInput>();
/**
 * Should be triggered from sign comfirmation screen
 */
const submitToNetwork = createEvent();
/**
 * Submitting is done, finishes flow
 */
const formSubmitted = createEvent<Result[]>();
/**
 * Handlers for each extrinsic submitting result
 */
const extrinsicSucceeded = createEvent<{ id: number; signatory: AccountId; params: ExtrinsicResultParams }>();
const extrinsicFailed = createEvent<{ id: number; signatory: AccountId; params: string }>();
/**
 * All extrinsic are settled
 */
const txsExecuted = createEvent();

// intermediate state

const $submitStore = createStore<SubmitInput | null>(null);

const $submitStep = createStore<{ step: SubmitStep; message: string }>({ step: SubmitStep.LOADING, message: '' }).reset(
  start,
);

const $submittingTxs = createStore<number[]>([]);
const $results = createStore<Result[]>([]).reset(start);

// effects

const submitExtrinsicFx = createEffect(async ({ api, payloads }: SubmitInput) => {
  const boundExtrinsicSucceeded = scopeBind(extrinsicSucceeded, { safe: true });
  const boundExtrinsicFailed = scopeBind(extrinsicFailed, { safe: true });

  for (const [index, { extrinsic, signatory, signature, payload }] of payloads.entries()) {
    transactionService.submitExtrinsic(extrinsic, signature, payload, signatory, api).then((result) => {
      if (result.executed) {
        boundExtrinsicSucceeded({ id: index, signatory, params: result.params });
      } else {
        boundExtrinsicFailed({ id: index, signatory, params: result.error });
      }
    });
  }
});

// deprecated flow with Transaction struct

type SplitTransactionsParams = {
  api: ApiPromise;
  wrappedTxs: Transaction[];
  txPayloads: Uint8Array[];
  signatures: HexString[];
  chain: Chain;
};
const splitTransactionsFx = createEffect(
  async ({ api, wrappedTxs, txPayloads, signatures, chain }: SplitTransactionsParams): Promise<SubmitInput> => {
    let splittedBatch: Transaction[] = [];

    for (const tx of wrappedTxs) {
      if (tx.type === TransactionType.BATCH_ALL) {
        const batchAllTxs = await transactionBuilder.splitBatchAll({
          transaction: tx,
          chain,
          api,
        });

        splittedBatch = splittedBatch.concat(batchAllTxs);
      } else {
        splittedBatch.push(tx);
      }
    }

    const payloads: SubmitPayload[] = splittedBatch.map((tx, index) => ({
      extrinsic: getExtrinsic[tx.type](tx.args, api),
      payload: txPayloads[index],
      signature: signatures[index],
      signatory: tx.accountId,
    }));

    return {
      api,
      payloads,
    };
  },
);

sample({
  clock: formInitiated,
  source: {
    apis: networkModel.$apis,
  },
  fn({ apis }, { chain, wrappedTxs, txPayloads, signatures }): SplitTransactionsParams {
    const api = apis[chain.chainId];
    assert(api, `Api for chain ${chain.chainId} not found`);

    return {
      api,
      wrappedTxs,
      txPayloads,
      signatures,
      chain,
    };
  },
  target: splitTransactionsFx,
});

sample({
  clock: splitTransactionsFx.doneData,
  target: start,
});

// actual flow

sample({
  clock: start,
  target: $submitStore,
});

sample({
  clock: submitToNetwork,
  source: $submitStore,
  filter: (params) => Boolean(params),
  fn: (params) => params?.payloads.map((_, index) => index) || [],
  target: $submittingTxs,
});

sample({
  clock: submitToNetwork,
  source: $submitStore,
  filter: nonNullable,
  target: submitExtrinsicFx,
});

sample({
  clock: [extrinsicSucceeded, extrinsicFailed],
  source: $submittingTxs,
  fn: (txs, { id }) => {
    return removeFromCollection(txs, id);
  },
  target: $submittingTxs,
});

sample({
  clock: extrinsicSucceeded,
  source: $results,
  fn: (results, extrinsicResult) => {
    return [
      ...results,
      {
        result: ExtrinsicResult.SUCCESS,
        ...extrinsicResult,
      },
    ];
  },
  target: $results,
});

sample({
  clock: extrinsicFailed,
  source: $results,
  fn: (results, extrinsicResult) => {
    return [
      ...results,
      {
        result: ExtrinsicResult.ERROR,
        ...extrinsicResult,
      },
    ];
  },
  target: $results,
});

sample({
  clock: $submittingTxs,
  filter: (txs) => txs.length === 0,
  target: txsExecuted,
});

sample({
  clock: once({
    source: txsExecuted,
    reset: submitToNetwork,
  }),
  source: $results,
  fn: (results) => {
    if (results.every(({ result }) => result === ExtrinsicResult.SUCCESS)) {
      return { step: SubmitStep.SUCCESS, message: '' };
    }

    if (results.every(({ result }) => result === ExtrinsicResult.ERROR)) {
      return { step: SubmitStep.ERROR, message: results[0].params as string };
    }

    return { step: SubmitStep.WARNING, message: '' };
  },
  target: $submitStep,
});

sample({
  clock: $submitStep,
  source: $results,
  filter: (_, { step }) => step !== SubmitStep.LOADING,
  target: formSubmitted,
});

sample({
  clock: formSubmitted,
  fn: () => null,
  target: $submitStore,
});

export const submitModel = {
  $submitStore,
  $submitStep,
  $failedTxs: $results.map((result) => result.filter((r) => r.result === ExtrinsicResult.ERROR)),

  events: {
    start,
    /**
     * @deprecated Use "submitModel.events.start" instead
     */
    formInitiated,
    submitToNetwork,
  },
  output: {
    formSubmitted,
    extrinsicSucceeded,
    extrinsicFailed,
  },
};
