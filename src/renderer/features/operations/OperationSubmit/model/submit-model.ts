import { createEvent, createEffect, restore, sample, scopeBind, createStore, createApi } from 'effector';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { ApiPromise } from '@polkadot/api';

import type { Chain, Account, HexString, MultisigAccount } from '@shared/core';
import { networkModel } from '@entities/network';
import { ISecureMessenger } from '@shared/api/matrix';
import { matrixModel, matrixUtils } from '@entities/matrix';
import { buildMultisigTx } from '@entities/multisig';
import { SubmitStep } from '../lib/types';
import {
  Transaction,
  MultisigTransaction,
  ExtrinsicResultParams,
  MultisigEvent,
  transactionService,
} from '@entities/transaction';

type Input = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  description: string;
  transactions: Transaction[];
  multisigTxs?: Transaction[];

  signatures: HexString[];
  unsignedTxs: UnsignedTransaction[];
};

const formInitiated = createEvent<Input>();
const submitStarted = createEvent();
const formSubmitted = createEvent<ExtrinsicResultParams>();

const extrinsicSucceeded = createEvent<ExtrinsicResultParams>();
const extrinsicFailed = createEvent<string>();

const $submitStore = restore<Input>(formInitiated, null);

const $submitStep = createStore<{ step: SubmitStep; message: string }>({ step: SubmitStep.LOADING, message: '' });

type Callbacks = {
  addMultisigTx: (tx: MultisigTransaction) => Promise<void>;
  addEventWithQueue: (event: MultisigEvent) => void;
};
const $hooks = createStore<Callbacks | null>(null);
const $hooksApi = createApi($hooks, {
  hooksChanged: (state, { addMultisigTx, addEventWithQueue }) => ({ ...state, addMultisigTx, addEventWithQueue }),
});

type SignedExtrinsicParams = {
  api: ApiPromise;
  signatures: HexString[];
  unsignedTxs: UnsignedTransaction[];
};
const getSignedExtrinsicsFx = createEffect(
  ({ api, signatures, unsignedTxs }: SignedExtrinsicParams): Promise<string[]> => {
    const requests = signatures.map((signature, index) => {
      return transactionService.getSignedExtrinsic(unsignedTxs[index], signature, api);
    });

    return Promise.all(requests);
  },
);

type SubmitExtrinsicParams = {
  api: ApiPromise;
  extrinsics: string[];
  unsignedTxs: UnsignedTransaction[];
};
const submitExtrinsicsFx = createEffect(({ api, extrinsics, unsignedTxs }: SubmitExtrinsicParams): void => {
  const boundExtrinsicSucceeded = scopeBind(extrinsicSucceeded, { safe: true });
  const boundExtrinsicFailed = scopeBind(extrinsicFailed, { safe: true });

  extrinsics.forEach((extrinsic, index) => {
    transactionService.submitAndWatchExtrinsic(extrinsic, unsignedTxs[index], api, (executed, params) => {
      if (executed) {
        boundExtrinsicSucceeded(params as ExtrinsicResultParams);
      } else {
        boundExtrinsicFailed(params as string);
      }
    });
  });
});

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

type ApproveParams = {
  matrix: ISecureMessenger;
  matrixRoomId: string;
  multisigTxs: MultisigTransaction[];
  description: string;
  params: ExtrinsicResultParams;
};
const sendMatrixApproveFx = createEffect(
  ({ matrix, matrixRoomId, multisigTxs, description, params }: ApproveParams) => {
    multisigTxs.forEach((tx) => {
      matrix.sendApprove(matrixRoomId, {
        description,
        senderAccountId: tx.depositor!,
        chainId: tx.chainId,
        callHash: tx.callHash,
        callData: tx.callData,
        extrinsicTimepoint: params.timepoint,
        extrinsicHash: params.extrinsicHash,
        error: Boolean(params.multisigError),
        callTimepoint: {
          height: tx.blockCreated || params.timepoint.height,
          index: tx.indexCreated || params.timepoint.index,
        },
      });
    });
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
    api: apis[params!.chain.chainId],
    signatures: params!.signatures,
    unsignedTxs: params!.unsignedTxs,
  }),
  target: getSignedExtrinsicsFx,
});

sample({
  clock: getSignedExtrinsicsFx.done,
  fn: ({ params, result }) => ({
    api: params.api,
    extrinsics: result,
    unsignedTxs: params.unsignedTxs,
  }),
  target: submitExtrinsicsFx,
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
    loginStatus: matrixModel.$loginStatus,
    hooks: $hooks,
  },
  filter: ({ submitStore, loginStatus }) => {
    return matrixUtils.isLoggedIn(loginStatus) && Boolean(submitStore?.multisigTxs);
  },
  fn: ({ submitStore, hooks }, params) => ({
    params,
    hooks: hooks!,
    transactions: submitStore!.transactions,
    multisigTxs: submitStore!.multisigTxs!,
    multisigAccount: submitStore!.account as MultisigAccount,
    description: submitStore!.description,
  }),
  target: saveMultisigTxFx,
});

sample({
  clock: saveMultisigTxFx.done,
  source: {
    matrix: matrixModel.$matrix,
    loginStatus: matrixModel.$loginStatus,
    submitStore: $submitStore,
  },
  filter: ({ loginStatus, submitStore }) => {
    return (
      matrixUtils.isLoggedIn(loginStatus) &&
      Boolean(submitStore?.multisigTxs) &&
      Boolean((submitStore!.account as MultisigAccount).matrixRoomId)
    );
  },
  fn: ({ matrix, submitStore }, { params, result }) => ({
    matrix,
    matrixRoomId: (submitStore?.account as MultisigAccount).matrixRoomId!,
    multisigTxs: result.transactions,
    description: submitStore?.description!,
    params: params.params,
  }),
  target: sendMatrixApproveFx,
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
  },
};
