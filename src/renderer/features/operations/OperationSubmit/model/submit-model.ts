import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { t } from 'i18next';
import { once, reset } from 'patronum';

import { type Chain, type HexString, type Transaction } from '@/shared/core';
import { assert, nonNullable, removeFromCollection } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { type ExtrinsicResultParams } from '@/entities/transaction';
import { type SignatureResult } from '@/features/operations/OperationSign/model/sign-model';
import { BuildSignedExtrinsicsError, BuildSignedExtrinsicsFailure, ExtrinsicResult, SubmitStep } from '../lib/types';

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
const $results = createStore<Result[]>([]).reset([formInitiated, init]);

reset({
  clock: formInitiated,
  target: $submitStep,
});

// effects

const submitExtrinsicFx = createEffect((payloads: SubmitInput) => {
  const boundExtrinsicSucceeded = scopeBind(extrinsicSucceeded, { safe: true });
  const boundExtrinsicFailed = scopeBind(extrinsicFailed, { safe: true });

  return Promise.all(
    Array.from(payloads.entries()).map(([index, { api, extrinsic, signatory, signature, payload }]) => {
      return transactionService.submitExtrinsic(extrinsic, signature, payload, signatory, api).then((result) => {
        if (result.executed) {
          const dispatchError = result.params.proxyError || result.params.multisigError;
          if (dispatchError) {
            boundExtrinsicFailed({ id: index, signatory, params: dispatchError });
          } else {
            boundExtrinsicSucceeded({ id: index, signatory, params: result.params });
          }
        } else {
          boundExtrinsicFailed({ id: index, signatory, params: result.error });
        }
      });
    }),
  );
});

// deprecated flow with Transaction struct.
// The batch was split and signed in sign-model; every extrinsic is rebuilt here from the payload that was actually
// signed instead of splitting the transactions again, so each signature lands on the extrinsic it covers.

type BuildSignedExtrinsicsParams = {
  api: ApiPromise;
  wrappedTxs: Transaction[];
  txPayloads: Uint8Array[];
  signatures: HexString[];
};

const buildSignedExtrinsicsFx = createEffect<BuildSignedExtrinsicsParams, SubmitInput, Error>(
  ({ api, wrappedTxs, txPayloads, signatures }) => {
    if (txPayloads.length === 0) {
      throw new BuildSignedExtrinsicsError(BuildSignedExtrinsicsFailure.EMPTY, 'Nothing was signed');
    }

    if (txPayloads.length !== signatures.length) {
      throw new BuildSignedExtrinsicsError(
        BuildSignedExtrinsicsFailure.COUNT_MISMATCH,
        `Signed payloads (${txPayloads.length}) and signatures (${signatures.length}) do not match`,
      );
    }

    // The deprecated `formSubmitted` contract carries signatures without their signatory (sign-model drops it when
    // converting `SignatureResult`), and ~15 flows still go through it. Instead of widening that contract, the
    // signatory is recovered by checking which of the operation's accounts made each signature.
    const signatories = [...new Set(wrappedTxs.map((tx) => tx.accountId))];

    return txPayloads.map((payload, index) => {
      const signature = signatures[index]!;
      const signatory = signatories.find((accountId) => {
        return transactionService.verifyPayloadSignature(payload, signature, accountId);
      });

      if (!signatory) {
        throw new BuildSignedExtrinsicsError(
          BuildSignedExtrinsicsFailure.UNKNOWN_SIGNATORY,
          `Signature ${index + 1} of ${signatures.length} was not made by a signatory of the operation`,
        );
      }

      const extrinsicPayload = api.registry.createType('ExtrinsicPayload', payload, { version: api.extrinsicVersion });
      const extrinsic = transactionService.createExtrinsicFromCallData(extrinsicPayload.method.toHex(), api);

      return { api, extrinsic, payload, signature, signatory };
    });
  },
);

const BUILD_FAILURE_MESSAGES: Record<BuildSignedExtrinsicsFailure, string> = {
  [BuildSignedExtrinsicsFailure.EMPTY]: 'operation.submitErrors.nothingSigned',
  [BuildSignedExtrinsicsFailure.COUNT_MISMATCH]: 'operation.submitErrors.signatureCountMismatch',
  [BuildSignedExtrinsicsFailure.UNKNOWN_SIGNATORY]: 'operation.submitErrors.unknownSignatory',
};

sample({
  clock: formInitiated,
  source: {
    apis: networkModel.$apis,
  },
  fn({ apis }, { chain, wrappedTxs, txPayloads, signatures }): BuildSignedExtrinsicsParams {
    const api = apis[chain.chainId];
    assert(api, `Api for chain ${chain.chainId} not found`);

    return {
      api,
      wrappedTxs,
      txPayloads,
      signatures,
    };
  },
  target: buildSignedExtrinsicsFx,
});

sample({
  clock: buildSignedExtrinsicsFx.doneData,
  target: init,
});

// nothing was submitted: show the error, but "done" is reserved for a finished submission
sample({
  clock: buildSignedExtrinsicsFx.failData,
  fn: (error) => {
    const key =
      error instanceof BuildSignedExtrinsicsError
        ? BUILD_FAILURE_MESSAGES[error.reason]
        : 'operation.submitErrors.buildFailed';

    return { step: SubmitStep.ERROR, message: t(key) };
  },
  target: $submitStep,
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
      return { step: SubmitStep.ERROR, message: results[0]?.params as string };
    }

    return { step: SubmitStep.WARNING, message: '' };
  },
  target: $submitStep,
});

// a failed rebuild in the deprecated flow never reaches $submitStore, so it does not finish the flow
sample({
  clock: $submitStep,
  source: { results: $results, store: $submitStore },
  filter: ({ store }, { step }) => step !== SubmitStep.LOADING && store !== null,
  fn: ({ results }) => results,
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
