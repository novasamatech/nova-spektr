import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { t } from 'i18next';
import { spread } from 'patronum';
import { toast } from 'sonner';

import { type Transaction } from '@/shared/core';
import { isStep, nonNullable, nullable, validateAddress } from '@/shared/lib/utils';
import { HttpError, operationDescriptionsResource, operationsService } from '@/domains/backend';
import { multisigOperationService } from '@/domains/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { multisigService } from '@/features/multisig-wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { type TransferConfirmStore, transferConfirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStoreParams, type TransferStore, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStoreParams>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);
const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

const $transferStore = createStore<TransferStore | null>(null);

const $tx = createStore<Transaction | null>(null);
const $coreTx = createStore<Transaction | null>(null);

const $xcmChain = combine(
  {
    transferStore: $transferStore,
    network: formModel.$networkStore,
  },
  ({ transferStore, network }) => {
    if (!network || !transferStore) return null;

    return transferStore.destinationChain.chainId === network.chain.chainId
      ? null
      : (transferStore.destinationChain ?? null);
  },
);

const $initiatorWallet = combine(
  {
    store: $transferStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return null;
    return walletUtils.getWalletById(wallets, store.initiator.walletId) ?? null;
  },
);

sample({ clock: stepChanged, target: $step });

sample({
  clock: flowStarted,
  target: formModel.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModel.formSubmitted,
  fn: ({
    tx,
    coreTx,
    initiator,
    signatory,
    amount,
    destination,
    destinationChain,
    fee,
    originFee,
    multisigDeposit,
  }) => {
    const store = {
      initiator,
      signatory,
      amount,
      destination,
      destinationChain,
      fee,
      originFee,
      multisigDeposit,
    } satisfies TransferStore;

    return {
      tx,
      coreTx,
      store,
    };
  },
  target: spread({
    tx: $tx,
    coreTx: $coreTx,
    store: $transferStore,
  }),
});

const readyToConfirm = sample({
  clock: formModel.formSubmitted,
  source: {
    networkStore: formModel.$networkStore,
  },
  fn: ({ networkStore }, form) => {
    if (nullable(networkStore) || !validateAddress(form.destination)) return null;

    const event: TransferConfirmStore = {
      id: 0,
      coreTx: form.coreTx,
      tx: form.tx,
      chain: networkStore.chain,
      asset: networkStore.asset,
      initiator: form.initiator,
      signatory: form.signatory,
      destinationChain: form.destinationChain,
      destination: form.destination,
      route: form.route,
      amount: form.amount,
      rawAmount: form.rawAmount,
      fee: form.fee,
      originFee: form.originFee,
      destinationFee: form.destinationFee,
      multisigDeposit: form.multisigDeposit,
      balancePreservation: form.balancePreservation,
    };

    return event;
  },
});

sample({
  clock: readyToConfirm.filter({ fn: nonNullable }),
  fn: (event) => ({
    events: [event],
    step: Step.CONFIRM,
  }),
  target: spread({
    events: transferConfirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: transferConfirmModel.confirmed,
  source: {
    transferStore: $transferStore,
    networkStore: formModel.$networkStore,
    wrappedTx: $tx,
  },
  filter: ({ transferStore, networkStore, wrappedTx }) => {
    return Boolean(transferStore) && Boolean(networkStore) && Boolean(wrappedTx);
  },
  fn: ({ transferStore, networkStore, wrappedTx }) => ({
    event: {
      signingPayloads: [
        {
          chain: networkStore!.chain,
          account: transferStore!.initiator,
          signatory: transferStore!.signatory,
          transaction: wrappedTx!,
        },
      ],
    },
    step: Step.SIGN,
  }),
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.signed,
  source: {
    step: $step,
    transferStore: $transferStore,
    networkStore: formModel.$networkStore,
    coreTx: $coreTx,
    wrappedTx: $tx,
  },
  filter: (transferData) => {
    return (
      isStep(transferData.step, Step.SIGN) &&
      Boolean(transferData.transferStore) &&
      Boolean(transferData.wrappedTx) &&
      Boolean(transferData.coreTx) &&
      Boolean(transferData.networkStore)
    );
  },
  fn: (_, signParams) => ({
    event: signParams,
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: submitModel.done,
  source: { coreTx: $coreTx, wrappedTx: $tx, multisigAccount: formModel.$multisigAccount },
  filter: ({ multisigAccount }, results) =>
    nonNullable(multisigAccount) && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ coreTx, wrappedTx, multisigAccount }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx!.chainId,
      callHash: wrappedTx!.args.callHash,
      multisigAccountId: multisigService.getMultisigAccountId(multisigAccount!),
      blockCreated: timepoint.height,
      indexCreated: timepoint.index,
    });
  },
  target: $redirectAfterSubmitPath,
});

const postDescriptionFx = createEffect(
  async (params: {
    baseUrl: string;
    multisigAccountId: string;
    chainId: string;
    callHash: string;
    blockNumber: number;
    extrinsicIndex: number;
    description: string;
  }) => {
    const { baseUrl, ...body } = params;
    await operationsService.createDescription(baseUrl, body);
  },
);

sample({
  clock: submitModel.done,
  source: {
    coreTx: $coreTx,
    wrappedTx: $tx,
    multisigAccount: formModel.$multisigAccount,
    description: formModel.$description,
    baseUrl: backendConfigurationModel.$backendUrl,
    isAuthenticated: authModel.$isAuthenticated,
  },
  filter: ({ multisigAccount, description, baseUrl, isAuthenticated }, results) =>
    nonNullable(multisigAccount) &&
    submitUtils.isSuccessResult(results[0]!.result) &&
    description.length > 0 &&
    nonNullable(baseUrl) &&
    isAuthenticated,
  fn: ({ coreTx, wrappedTx, multisigAccount, description, baseUrl }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;

    return {
      baseUrl: baseUrl!,
      multisigAccountId: multisigService.getMultisigAccountId(multisigAccount!),
      chainId: coreTx!.chainId,
      callHash: wrappedTx!.args.callHash,
      blockNumber: timepoint.height,
      extrinsicIndex: timepoint.index,
      description,
    };
  },
  target: postDescriptionFx,
});

const showDescriptionErrorFx = createEffect((error: Error) => {
  const description =
    error instanceof HttpError && error.status === 403 ? t('addressBook.sources.errorForbidden') : error.message;
  toast.error(t('operation.descriptionSaveError'), { description });
});

sample({
  clock: postDescriptionFx.failData,
  target: showDescriptionErrorFx,
});

sample({
  clock: postDescriptionFx.done,
  source: {
    coreTx: $coreTx,
    wrappedTx: $tx,
    multisigAccount: formModel.$multisigAccount,
    description: formModel.$description,
  },
  filter: ({ multisigAccount, description }) => nonNullable(multisigAccount) && description.length > 0,
  fn: ({ coreTx, wrappedTx, multisigAccount, description }, { params: { blockNumber, extrinsicIndex } }) => {
    const multisigAccountId = multisigService.getMultisigAccountId(multisigAccount!);
    // Must match multisigOperationService.getOperationId format:
    // `${chainId}-${callHash}-${accountId}-${block}-${index}`
    const id = `${coreTx!.chainId}-${wrappedTx!.args.callHash}-${multisigAccountId}-${blockNumber}-${extrinsicIndex}`;

    return { id, description };
  },
  target: operationDescriptionsResource.descriptionCreated,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.formCleared],
});

sample({
  clock: txSaved,
  source: {
    coreTx: $coreTx,
  },
  filter: ({ coreTx }) => nonNullable(coreTx),
  fn: ({ coreTx }) => {
    const tx: BasketTransactionDraft = {
      initiatorAccountId: coreTx!.accountId,
      coreTx: coreTx!,
      route: [],
      createdAt: Date.now(),
    };

    return [tx];
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const transferModel = {
  $step,
  $xcmChain,
  $initiatorWallet,
  $redirectAfterSubmitPath,

  events: {
    flowStarted,
    txSaved,
    stepChanged,
  },

  output: {
    flowFinished,
  },
};
