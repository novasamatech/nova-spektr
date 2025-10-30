import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { once, reset } from 'patronum';

import { type Chain, type HexString, type Transaction } from '@/shared/core';
import { assert, createAsyncTaskPool, nonNullable, removeFromCollection } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type Extrinsic, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { type ExtrinsicResultParams, getExtrinsic } from '@/entities/transaction';
import { type SignatureResult } from '@/features/operations/OperationSign/model/sign-model';
import { ExtrinsicResult, SubmitStep } from '../lib/types';

export type SubmitInputDeprecated = {
  chain: Chain;
  account: AnyAccount;
  coreTxs: Transaction[];
  wrappedTxs: Transaction[];

  signatures: HexString[];
  txPayloads: Uint8Array[];
};

type SubmitInput = SignatureResult[];

export type SuccessResult = {
  id: number;
  result: ExtrinsicResult.SUCCESS;
  params: ExtrinsicResultParams;
};

export type ErrorResult = {
  id: number;
  result: ExtrinsicResult.ERROR;
  params: string;
};

type Result = SuccessResult | ErrorResult;

/**
 * Flow entry point
 *
 * @deperecated use "init" event instead
 */
const formInitiated = createEvent<SubmitInputDeprecated>();
/**
 * Flow entry point
 */
const init = createEvent<SubmitInput>();
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

const $submitStep = createStore<{ step: SubmitStep; message: string }>({ step: SubmitStep.LOADING, message: '' });

const $submittingTxs = createStore<number[]>([]);
const $results = createStore<Result[]>([]).reset(init);

// effects

const submitExtrinsicFx = createEffect((payloads: SubmitInput) => {
  const boundExtrinsicSucceeded = scopeBind(extrinsicSucceeded, { safe: true });
  const boundExtrinsicFailed = scopeBind(extrinsicFailed, { safe: true });

  const asyncTaskPool = createAsyncTaskPool({
    poolSize: 1,
    retryCount: 0,
    retryDelay: 0,
  });

  return Promise.all(
    Array.from(payloads.entries()).map(([index, { api, extrinsic, signatory, signature, payload }]) => {
      return asyncTaskPool.call(
        () => {
          return transactionService.submitExtrinsic(extrinsic, signature, payload, signatory, api).then((result) => {
            if (result.executed) {
              boundExtrinsicSucceeded({ id: index, signatory, params: result.params });
            } else {
              boundExtrinsicFailed({ id: index, signatory, params: result.error });
            }
          });
        },
        { pool: signatory + api.genesisHash.toHex() },
      );
    }),
  );
});

// deprecated flow with Transaction struct. Split impl located in sign-model.

type SplitTransactionsParams = {
  api: ApiPromise;
  wrappedTxs: Transaction[];
  txPayloads: Uint8Array[];
  signatures: HexString[];
};
const splitTransactionsFx = createEffect(
  async ({ api, wrappedTxs, txPayloads, signatures }: SplitTransactionsParams): Promise<SubmitInput> => {
    let splittedBatch: { extrinsic: Extrinsic; signatory: AccountId }[] = [];

    for (const tx of wrappedTxs) {
      const extrinsic = getExtrinsic[tx.type](tx.args, api);
      const splitted = await transactionService.splitExtrinsic(extrinsic, api);

      splittedBatch = splittedBatch.concat(splitted.map((extrinsic) => ({ extrinsic, signatory: tx.accountId })));
    }

    return splittedBatch.map(({ extrinsic, signatory }, index) => ({
      api,
      extrinsic,
      payload: txPayloads[index],
      signature: signatures[index],
      signatory,
    }));
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
    };
  },
  target: splitTransactionsFx,
});

sample({
  clock: splitTransactionsFx.doneData,
  target: init,
});

// actual flow

reset({
  clock: init,
  target: $submitStep,
});

sample({
  clock: init,
  target: $submitStore,
});

sample({
  clock: submitToNetwork,
  source: $submitStore,
  filter: nonNullable,
  target: submitExtrinsicFx,
});

sample({
  clock: submitExtrinsicFx,
  fn: (payloads) => payloads.map((_, index) => index),
  target: $submittingTxs,
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
    const succeedResult: SuccessResult = {
      result: ExtrinsicResult.SUCCESS,
      params: extrinsicResult.params,
      id: extrinsicResult.id,
    };

    return [...results, succeedResult];
  },
  target: $results,
});

sample({
  clock: extrinsicFailed,
  source: $results,
  fn: (results, extrinsicResult) => {
    const failedResults: ErrorResult = {
      result: ExtrinsicResult.ERROR,
      params: extrinsicResult.params,
      id: extrinsicResult.id,
    };

    return [...results, failedResults];
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
  $succeedTxs: $results.map((result) => result.filter((r) => r.result === ExtrinsicResult.SUCCESS)),

  init,
  done: formSubmitted,
  submitToNetwork,

  events: {
    /**
     * @deprecated Use submitModel.init instead
     */
    formInitiated,
  },
  output: {
    /**
     * @deprecated Use submitModel.done instead
     */
    formSubmitted,
    extrinsicSucceeded,
    extrinsicFailed,
  },
};
