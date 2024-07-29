import { type ApiPromise } from '@polkadot/api';
import { createApi, createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import { once } from 'patronum';

import {
  type Account,
  type Chain,
  type ChainId,
  type HexString,
  type MultisigAccount,
  type MultisigEvent,
  type MultisigTransaction,
  type Transaction,
} from '@shared/core';
import { removeFromCollection } from '@shared/lib/utils';
import { buildMultisigTx } from '@entities/multisig';
import { networkModel } from '@entities/network';
import { type ExtrinsicResultParams, transactionService } from '@entities/transaction';
import { ExtrinsicResult, SubmitStep } from '../lib/types';

type Input = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  description: string;
  coreTxs: Transaction[];
  wrappedTxs: Transaction[];
  multisigTxs: Transaction[];

  signatures: HexString[];
  txPayloads: Uint8Array[];
};

type Result = { id: number; result: ExtrinsicResult; params: ExtrinsicResultParams | string };

const formInitiated = createEvent<Input>();
const submitStarted = createEvent();
const formSubmitted = createEvent<Result[]>();

const extrinsicSucceeded = createEvent<{ id: number; params: ExtrinsicResultParams }>();
const extrinsicFailed = createEvent<{ id: number; params: string }>();
const txsExecuted = createEvent();

const $submitStore = restore<Input>(formInitiated, null);

const $submitStep = createStore<{ step: SubmitStep; message: string }>({ step: SubmitStep.LOADING, message: '' });
const $submittingTxs = createStore<number[]>([]);
const $results = createStore<Result[]>([]).reset(formInitiated);

type Callbacks = {
  addMultisigTx: (tx: MultisigTransaction) => Promise<void>;
  addEventWithQueue: (event: MultisigEvent) => void;
};
const $hooks = createStore<Callbacks | null>(null);
const $hooksApi = createApi($hooks, {
  hooksChanged: (state, { addMultisigTx, addEventWithQueue }) => ({ ...state, addMultisigTx, addEventWithQueue }),
});

type SignAndSubmitExtrinsicParams = {
  apis: Record<ChainId, ApiPromise>;
  wrappedTxs: Transaction[];
  txPayloads: Uint8Array[];
  signatures: HexString[];
};
const signAndSubmitExtrinsicsFx = createEffect(
  ({ apis, wrappedTxs, txPayloads, signatures }: SignAndSubmitExtrinsicParams): void => {
    const boundExtrinsicSucceeded = scopeBind(extrinsicSucceeded, { safe: true });
    const boundExtrinsicFailed = scopeBind(extrinsicFailed, { safe: true });

    wrappedTxs.forEach((transaction, index) => {
      transactionService.signAndSubmit(
        transaction,
        signatures[index],
        txPayloads[index],
        apis[transaction.chainId],
        (executed, params) => {
          if (executed) {
            boundExtrinsicSucceeded({ id: index, params: params as ExtrinsicResultParams });
          } else {
            boundExtrinsicFailed({ id: index, params: params as string });
          }
        },
      );
    });
  },
);

type SaveMultisigParams = {
  transactions: Transaction[];
  multisigTxs: Transaction[];
  multisigAccount: MultisigAccount;
  params: ExtrinsicResultParams;
  hooks: Callbacks;
  description?: string;
};

type SaveMultisigResult = {
  transactions: MultisigTransaction[];
  events: MultisigEvent[];
};
const saveMultisigTxFx = createEffect(
  ({
    transactions,
    multisigTxs,
    multisigAccount,
    params,
    hooks,
    description,
  }: SaveMultisigParams): SaveMultisigResult => {
    const { txs, events } = transactions.reduce<{ txs: MultisigTransaction[]; events: MultisigEvent[] }>(
      (acc, transaction, index) => {
        const multisigData = buildMultisigTx(transaction, multisigTxs[index], params, multisigAccount, description);

        hooks.addEventWithQueue(multisigData.event);
        hooks.addMultisigTx(multisigData.transaction);
        acc.txs.push(multisigData.transaction);
        acc.events.push(multisigData.event);

        console.log(`New transaction was created with call hash ${multisigData.transaction.callHash}`);

        return acc;
      },
      { txs: [], events: [] },
    );

    return { transactions: txs, events };
  },
);

sample({ clock: formInitiated, target: $submitStep.reinit });

sample({
  clock: submitStarted,
  source: $submitStore,
  filter: (params) => Boolean(params),
  fn: (params) => params?.txPayloads.map((_, index) => index) || [],
  target: $submittingTxs,
});

sample({
  clock: submitStarted,
  source: {
    params: $submitStore,
    apis: networkModel.$apis,
  },
  filter: ({ params }) => Boolean(params),
  fn: ({ apis, params }) => ({
    apis,
    signatures: params!.signatures,
    wrappedTxs: params!.wrappedTxs,
    coreTxs: params!.coreTxs,
    txPayloads: params!.txPayloads,
  }),
  target: signAndSubmitExtrinsicsFx,
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
  clock: extrinsicSucceeded,
  source: {
    submitStore: $submitStore,
    hooks: $hooks,
  },
  filter: ({ submitStore }) => {
    return Boolean(submitStore?.multisigTxs.length);
  },
  fn: ({ submitStore, hooks }, { params }) => ({
    params,
    hooks: hooks!,
    transactions: submitStore!.coreTxs,
    multisigTxs: submitStore!.multisigTxs,
    multisigAccount: submitStore!.account as MultisigAccount,
    description: submitStore!.description,
  }),
  target: saveMultisigTxFx,
});

sample({
  clock: $submittingTxs,
  filter: (txs) => txs.length === 0,
  target: txsExecuted,
});

sample({
  clock: once({
    source: txsExecuted,
    reset: submitStarted,
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
  target: formSubmitted,
});

export const submitModel = {
  $submitStore,
  $submitStep,
  $failedTxs: $results.map((result) => result.filter((r) => r.result === ExtrinsicResult.ERROR)),

  events: {
    formInitiated,
    submitStarted,
    hooksApiChanged: $hooksApi.hooksChanged,
  },
  output: {
    formSubmitted,
  },
};
