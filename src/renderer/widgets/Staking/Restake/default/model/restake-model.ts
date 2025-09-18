import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { getRelaychainAsset, nonNullable, nullable } from '@/shared/lib/utils';
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

const $step = restore(stepChanged, Step.NONE);

const $restakeStore = createStore<RestakeStore | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    store: $restakeStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store?.initiator) return null;

    return walletUtils.getWalletById(wallets, store.initiator.walletId);
  },
);

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
  target: $restakeStore,
});

const formSubmitted = sample({
  clock: formModel.formSubmitted,
  source: {
    networkStore: $networkStore,
    coreTx: formModel.$coreTx,
    tx: formModel.$tx,
    route: formModel.$route,
  },
  fn: (source, formData) => ({ source, formData }),
}).filterMap(({ formData, source: { networkStore, coreTx, tx, route } }) => {
  if (
    nonNullable(networkStore) &&
    nonNullable(coreTx) &&
    nonNullable(tx) &&
    nonNullable(route) &&
    nonNullable(formData.initiator) &&
    nonNullable(formData.signatory)
  ) {
    return [
      {
        ...formData,
        initiator: formData.initiator,
        signatory: formData.signatory,
        chain: networkStore.chain,
        asset: getRelaychainAsset(networkStore!.chain.assets)!,
        coreTx,
        route,
        tx,
      } satisfies RestakeConfirm,
    ];
  }
});

sample({
  clock: formSubmitted,
  fn: (event) => {
    return {
      event,
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

const confirmStartSigning = sample({
  clock: confirmModel.startSigning,
  source: {
    restakeStore: $restakeStore,
    networkStore: $networkStore,
    tx: formModel.$tx,
  },
}).filterMap(({ restakeStore, networkStore, tx }) => {
  if (
    nonNullable(restakeStore?.initiator) &&
    nonNullable(restakeStore?.signatory) &&
    nonNullable(networkStore) &&
    nonNullable(tx)
  ) {
    return {
      signingPayloads: [
        {
          chain: networkStore.chain,
          account: restakeStore.initiator,
          signatory: restakeStore.signatory,
          transaction: tx,
        },
      ],
    };
  }
});

sample({
  clock: confirmStartSigning,
  fn: (event) => {
    return {
      event,
      step: Step.SIGN,
    };
  },
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

const signFormSubmitted = sample({
  clock: signModel.output.formSubmitted,
  source: {
    restakeStore: $restakeStore,
    networkStore: $networkStore,
    tx: formModel.$tx,
    coreTx: formModel.$coreTx,
  },
  fn: (source, signParams) => ({ source, signParams }),
}).filterMap(({ signParams, source: { restakeStore, networkStore, tx, coreTx } }) => {
  if (
    nonNullable(restakeStore?.initiator) &&
    nonNullable(restakeStore?.signatory) &&
    nonNullable(networkStore) &&
    nonNullable(tx) &&
    nonNullable(coreTx)
  ) {
    return {
      ...signParams,
      chain: networkStore.chain,
      account: restakeStore.initiator,
      signatory: restakeStore.signatory,
      wrappedTxs: [tx],
      coreTxs: [coreTx],
    };
  }
});

sample({
  clock: signFormSubmitted,
  fn: (event) => {
    return {
      event,
      step: Step.SUBMIT,
    };
  },
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
  source: formModel.$isAnyMultisig,
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
    coreTx: formModel.$coreTx,
    route: formModel.$route,
  },
  filter: ({ coreTx }) => nonNullable(coreTx),
  fn: ({ coreTx, route }) => {
    if (nullable(coreTx)) return [];

    return [
      {
        coreTx,
        route,
        groupId: Date.now(),
        initiatorAccountId: coreTx.accountId,
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
