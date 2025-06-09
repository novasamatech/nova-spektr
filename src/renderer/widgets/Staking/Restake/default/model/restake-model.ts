import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { getRelaychainAsset, nonNullable } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { walletModel, walletUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { restakeConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type RestakeConfirm } from '@/features/operations/OperationsConfirm/Restake/model/confirm-model';
import { type NetworkStore, type RestakeStore, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = createStore<Step>(Step.NONE);

const $restakeStore = createStore<RestakeStore | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    store: $restakeStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return null;

    return walletUtils.getWalletById(wallets, store.shards[0].walletId);
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
  fn: (formData) => {
    return { ...formData, shards: [formData.initiator!] };
  },
  target: $restakeStore,
});

sample({
  clock: formModel.formSubmitted,
  source: {
    networkStore: $networkStore,
    coreTx: formModel.$coreTx,
    tx: formModel.$tx,
    multisigTx: formModel.$multisigTx,
    route: formModel.$route,
  },
  filter: ({ networkStore }) => nonNullable(networkStore),
  fn: ({ networkStore, coreTx, tx, multisigTx, route }, formData) => ({
    event: [
      {
        ...formData,
        initiator: formData.initiator!,
        signatory: formData.signatory!,
        chain: networkStore!.chain,
        asset: getRelaychainAsset(networkStore!.chain.assets)!,
        coreTx: coreTx!,
        route: route,
        tx: tx!,
        multisigTx: multisigTx!,
      } satisfies RestakeConfirm,
    ],
    step: Step.CONFIRM,
  }),
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigning,
  source: {
    restakeStore: $restakeStore,
    networkStore: $networkStore,
    wrappedTx: formModel.$tx,
  },
  filter: ({ restakeStore, networkStore, wrappedTx }) => {
    return nonNullable(restakeStore) && nonNullable(networkStore) && nonNullable(wrappedTx);
  },
  fn: ({ restakeStore, networkStore, wrappedTx }) => ({
    event: {
      signingPayloads: [
        {
          chain: networkStore!.chain,
          account: restakeStore!.shards[0],
          signatory: restakeStore!.signatory,
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
  clock: signModel.output.formSubmitted,
  source: {
    restakeStore: $restakeStore,
    networkStore: $networkStore,
    multisigTx: formModel.$multisigTx,
    wrappedTx: formModel.$tx,
    coreTx: formModel.$coreTx,
  },
  filter: (transferData) => {
    return (
      nonNullable(transferData.restakeStore) &&
      nonNullable(transferData.wrappedTx) &&
      nonNullable(transferData.coreTx) &&
      nonNullable(transferData.networkStore)
    );
  },
  fn: (transferData, signParams) => ({
    event: {
      ...signParams,
      chain: transferData.networkStore!.chain,
      account: transferData.restakeStore!.shards[0],
      signatory: transferData.restakeStore!.signatory,
      wrappedTxs: [transferData.wrappedTx!],
      coreTxs: [transferData.coreTx!],
      multisigTxs: transferData.multisigTx ? [transferData.multisigTx] : [],
    },
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, formModel.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: formModel.$isMultisig,
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0].result),
  fn: () => Paths.OPERATIONS,
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

sample({
  clock: txSaved,
  source: {
    store: $restakeStore,
    coreTx: formModel.$coreTx,
    txWrappers: formModel.$txWrappers,
  },
  filter: ({ store, coreTx, txWrappers }) => {
    return nonNullable(store) && nonNullable(coreTx) && nonNullable(txWrappers);
  },
  fn: ({ store, coreTx, txWrappers }) => {
    const account = store!.shards.at(0);
    if (!account) throw new Error('Account not found');

    return [
      {
        coreTx: coreTx!,
        txWrappers,
        groupId: Date.now(),
        initiatorAccountId: account.accountId,
        createdAt: Date.now(),
      },
    ];
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const restakeModel = {
  $step,
  $networkStore,
  $initiatorWallet,

  flowStarted,
  stepChanged,
  txSaved,
  flowFinished,
};
