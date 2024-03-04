import { createEvent, createEffect, restore, sample, scopeBind, createStore } from 'effector';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { ApiPromise } from '@polkadot/api';

import type { Chain, Account, HexString, MultisigAccount } from '@shared/core';
import {
  Transaction,
  useTransaction,
  MultisigTransaction,
  ExtrinsicResultParams,
  MultisigEvent,
} from '@entities/transaction';
import { networkModel } from '@entities/network';
import { Matrix } from '@shared/api/matrix';
import { SubmitStep } from '../lib/types';
import { matrixModel, matrixUtils } from '@entities/matrix';
import { useMultisigTx, useMultisigEvent, buildMultisigTx } from '@entities/multisig';
import { useTaskQueue } from '@shared/lib/hooks';

// TODO: once we refactor following hooks, update the model
const { getSignedExtrinsic, submitAndWatchExtrinsic } = useTransaction();
const { addTask } = useTaskQueue();
const { addMultisigTx } = useMultisigTx({ addTask });
const { addEventWithQueue } = useMultisigEvent({ addTask });

type Input = {
  chain: Chain;
  account: Account;
  signatory: Account | null;
  description: string | null;
  transaction: Transaction;
  signature: HexString;
  unsignedTx: UnsignedTransaction;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent();

const extrinsicSucceeded = createEvent<ExtrinsicResultParams>();
const extrinsicFailed = createEvent<string>();

const $submitStore = restore<Input>(formInitiated, null);

const $submitStep = createStore<{ step: SubmitStep; message: string }>({ step: SubmitStep.LOADING, message: '' });

type SignedExtrinsicParams = {
  api: ApiPromise;
  signature: HexString;
  unsignedTx: UnsignedTransaction;
};
const getSignedExtrinsicFx = createEffect(({ api, signature, unsignedTx }: SignedExtrinsicParams): Promise<string> => {
  return getSignedExtrinsic(unsignedTx, signature, api);
});
type SubmitExtrinsicParams = {
  api: ApiPromise;
  unsignedTx: UnsignedTransaction;
  extrinsic: string;
};

const submitExtrinsicFx = createEffect(({ api, unsignedTx, extrinsic }: SubmitExtrinsicParams): void => {
  const boundExtrinsicSucceeded = scopeBind(extrinsicSucceeded);
  const boundExtrinsicFailed = scopeBind(extrinsicFailed);

  submitAndWatchExtrinsic(extrinsic, unsignedTx, api, async (executed, params) => {
    if (executed) {
      boundExtrinsicSucceeded(params as ExtrinsicResultParams);
    } else {
      boundExtrinsicFailed(params as string);
    }
  });
});

type SaveMultisigParams = {
  transaction: Transaction;
  multisigTx: Transaction;
  multisigAccount: MultisigAccount;
  params: ExtrinsicResultParams;
};

type SaveMultisigResult = {
  transaction: MultisigTransaction;
  event: MultisigEvent;
};
const saveMultisigTxFx = createEffect(
  async ({ transaction, multisigTx, multisigAccount, params }: SaveMultisigParams): Promise<SaveMultisigResult> => {
    const { transaction: tx, event } = buildMultisigTx(transaction, multisigTx, params, multisigAccount);

    addEventWithQueue(event);
    await addMultisigTx(tx);
    console.log(`New removeProxy transaction was created with call hash ${tx.callHash}`);

    return { transaction: tx, event };
  },
);

type ApproveParams = {
  matrix: Matrix;
  matrixRoomId: string;
  multisigTx: MultisigTransaction;
  description: string;
  params: ExtrinsicResultParams;
};
const sendMatrixApproveFx = createEffect(
  async ({ matrix, matrixRoomId, multisigTx, description, params }: ApproveParams): Promise<void> => {
    await matrix.sendApprove(matrixRoomId, {
      description,
      senderAccountId: multisigTx.depositor!,
      chainId: multisigTx.chainId,
      callHash: multisigTx.callHash,
      callData: multisigTx.callData,
      extrinsicTimepoint: params.timepoint,
      extrinsicHash: params.extrinsicHash,
      error: Boolean(params.multisigError),
      callTimepoint: {
        height: multisigTx.blockCreated || params.timepoint.height,
        index: multisigTx.indexCreated || params.timepoint.index,
      },
    });
  },
);

sample({
  clock: formInitiated,
  source: networkModel.$apis,
  fn: (apis, { chain, signature, unsignedTx }) => ({
    api: apis[chain.chainId],
    signature,
    unsignedTx,
  }),
  target: getSignedExtrinsicFx,
});

sample({
  clock: getSignedExtrinsicFx.done,
  fn: ({ params, result }) => ({
    api: params.api,
    unsignedTx: params.unsignedTx,
    extrinsic: result,
  }),
  target: submitExtrinsicFx,
});

sample({
  clock: extrinsicFailed,
  fn: (message) => ({ step: SubmitStep.ERROR, message }),
  target: $submitStep,
});

sample({
  clock: extrinsicSucceeded,
  source: {
    matrix: matrixModel.$matrix,
    loginStatus: matrixModel.$loginStatus,
  },
  filter: ({ loginStatus }) => {
    return matrixUtils.isLoggedIn(loginStatus);
    // account has matrixId
    // is multisig Tx
  },
  fn: ({ matrix }, params) => ({
    matrix,
    matrixRoomId: 'TEST',
    multisigTx,
    params,
  }),
  target: saveMultisigTxFx,
});

sample({
  clock: saveMultisigTxFx.done,
  source: {
    matrix: matrixModel.$matrix,
    submitStore: $submitStore,
  },
  filter: ({ loginStatus }) => {
    return matrixUtils.isLoggedIn(loginStatus);
    // account has matrixId
    // is multisig Tx
  },
  fn: ({ matrix, submitStore }, { params, result }) => ({
    matrix,
    matrixRoomId: 'TEST',
    multisigTx: result.transaction,
    description: submitStore!.description || '',
    params: params.params,
  }),
  target: sendMatrixApproveFx,
});

// TODO: add proxy in DB
// sample({
//   clock: extrinsicSucceeded,
//   source: {
//     // matrix: matrixModel.$matrix,
//     loginStatus: matrixModel.$loginStatus,
//   },
//   filter: ({ loginStatus }) => {
//     return matrixUtils.isLoggedIn(loginStatus);
//   },
//   fn: ({ matrix }) => ({
//     matrix,
//     matrixRoomId,
//     multisigTx,
//     params,
//   }),
//   target: sendMatrixApproveFx,
// });

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
  },
  output: {
    formSubmitted,
  },
};
