import { createEvent, createEffect, restore, sample, scopeBind, createStore, createApi } from 'effector';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { ApiPromise } from '@polkadot/api';

import type { Chain, Account, HexString, MultisigAccount } from '@shared/core';
import {
  Transaction,
  MultisigTransaction,
  ExtrinsicResultParams,
  MultisigEvent,
  getSignedExtrinsic,
  submitAndWatchExtrinsic,
} from '@entities/transaction';
import { networkModel } from '@entities/network';
import { ISecureMessenger } from '@shared/api/matrix';
import { SubmitStep } from '../lib/types';
import { matrixModel, matrixUtils } from '@entities/matrix';
import { buildMultisigTx } from '@entities/multisig';

type Input = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  description: string;
  transaction: Transaction;
  multisigTx?: Transaction;
  signature: HexString;
  unsignedTx: UnsignedTransaction;
};

const formInitiated = createEvent<Input>();
const submitStarted = createEvent();
const formSubmitted = createEvent();

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
  const boundExtrinsicSucceeded = scopeBind(extrinsicSucceeded, { safe: true });
  const boundExtrinsicFailed = scopeBind(extrinsicFailed, { safe: true });

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
  hooks: Callbacks;
};

type SaveMultisigResult = {
  transaction: MultisigTransaction;
  event: MultisigEvent;
};
const saveMultisigTxFx = createEffect(
  async ({
    transaction,
    multisigTx,
    multisigAccount,
    params,
    hooks,
  }: SaveMultisigParams): Promise<SaveMultisigResult> => {
    const { transaction: tx, event } = buildMultisigTx(transaction, multisigTx, params, multisigAccount);

    hooks.addEventWithQueue(event);
    await hooks.addMultisigTx(tx);
    console.log(`New removeProxy transaction was created with call hash ${tx.callHash}`);

    return { transaction: tx, event };
  },
);

type ApproveParams = {
  matrix: ISecureMessenger;
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

sample({ clock: formInitiated, target: $submitStep.reinit });

sample({
  clock: submitStarted,
  source: {
    params: $submitStore,
    apis: networkModel.$apis,
  },
  filter: ({ params }) => Boolean(params),
  fn: ({ apis, params }) => {
    return {
      api: apis[params!.chain.chainId],
      signature: params!.signature,
      unsignedTx: params!.unsignedTx,
    };
  },
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
    submitStore: $submitStore,
    loginStatus: matrixModel.$loginStatus,
    hooks: $hooks,
  },
  filter: ({ submitStore, loginStatus }) => {
    return matrixUtils.isLoggedIn(loginStatus) && Boolean(submitStore?.multisigTx);
  },
  fn: ({ submitStore, hooks }, params) => ({
    transaction: submitStore?.transaction!,
    multisigTx: submitStore?.multisigTx!,
    multisigAccount: submitStore?.account! as MultisigAccount,
    params,
    hooks: hooks!,
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
      Boolean(submitStore?.multisigTx) &&
      Boolean((submitStore!.account as MultisigAccount).matrixRoomId)
    );
  },
  fn: ({ matrix, submitStore }, { params, result }) => ({
    matrix,
    matrixRoomId: (submitStore?.account as MultisigAccount).matrixRoomId!,
    multisigTx: result.transaction,
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
