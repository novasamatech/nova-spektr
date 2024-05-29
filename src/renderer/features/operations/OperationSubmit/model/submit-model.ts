import { createEvent, createEffect, restore, sample, scopeBind, createStore, createApi } from 'effector';
import { ApiPromise } from '@polkadot/api';

import type {
  ChainId,
  Account,
  HexString,
  MultisigAccount,
  Transaction,
  MultisigTransaction,
  MultisigEvent,
} from '@shared/core';
import { networkModel } from '@entities/network';
import { buildMultisigTx } from '@entities/multisig';
import { SubmitStep } from '../lib/types';
import { ExtrinsicResultParams, transactionService } from '@entities/transaction';

type Input = {
  chainId: ChainId;
  account: Account;
  signatory?: Account;
  description: string;
  coreTxs: Transaction[];
  wrappedTxs: Transaction[];
  multisigTxs: Transaction[];

  signatures: HexString[];
  txPayloads: Uint8Array[];
};

const formInitiated = createEvent<Input>();
const submitStarted = createEvent();
const formSubmitted = createEvent<ExtrinsicResultParams>();

const extrinsicSucceeded = createEvent<ExtrinsicResultParams>();
const extrinsicFailed = createEvent<string>();

const $submitStore = restore<Input>(formInitiated, null).reset(formSubmitted);

const $submitStep = createStore<{ step: SubmitStep; message: string }>({ step: SubmitStep.LOADING, message: '' });

type Callbacks = {
  addMultisigTx: (tx: MultisigTransaction) => Promise<void>;
  addEventWithQueue: (event: MultisigEvent) => void;
};
const $hooks = createStore<Callbacks | null>(null);
const $hooksApi = createApi($hooks, {
  hooksChanged: (state, { addMultisigTx, addEventWithQueue }) => ({ ...state, addMultisigTx, addEventWithQueue }),
});

type SignAndSubmitExtrinsicParams = {
  api: ApiPromise;
  wrappedTxs: Transaction[];
  txPayloads: Uint8Array[];
  signatures: HexString[];
};
const signAndSubmitExtrinsicsFx = createEffect(
  ({ api, wrappedTxs, txPayloads, signatures }: SignAndSubmitExtrinsicParams): void => {
    const boundExtrinsicSucceeded = scopeBind(extrinsicSucceeded, { safe: true });
    const boundExtrinsicFailed = scopeBind(extrinsicFailed, { safe: true });

    wrappedTxs.forEach((transaction, index) => {
      transactionService.signAndSubmit(transaction, signatures[index], txPayloads[index], api, (executed, params) => {
        if (executed) {
          boundExtrinsicSucceeded(params as ExtrinsicResultParams);
        } else {
          boundExtrinsicFailed(params as string);
        }
      });
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
  source: {
    params: $submitStore,
    apis: networkModel.$apis,
  },
  filter: ({ params }) => Boolean(params),
  fn: ({ apis, params }) => ({
    api: apis[params!.chainId],
    signatures: params!.signatures,
    wrappedTxs: params!.wrappedTxs,
    coreTxs: params!.coreTxs,
    txPayloads: params!.txPayloads,
  }),
  target: signAndSubmitExtrinsicsFx,
});

sample({
  clock: extrinsicFailed,
  fn: (message) => ({ step: SubmitStep.ERROR, message }),
  target: $submitStep,
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
  fn: ({ submitStore, hooks }, params) => ({
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
  clock: extrinsicSucceeded,
  fn: () => ({ step: SubmitStep.SUCCESS, message: '' }),
  target: $submitStep,
});

sample({
  clock: extrinsicSucceeded,
  target: formSubmitted,
});

export const submitModel = {
  $submitStore,
  $submitStep,
  events: {
    formInitiated,
    submitStarted,
    hooksApiChanged: $hooksApi.hooksChanged,
  },
  output: {
    formSubmitted,
    extrinsicSucceeded,
  },
};
