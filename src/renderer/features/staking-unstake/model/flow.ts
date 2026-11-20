import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Transaction } from '@/shared/core';
import { getRelaychainAsset, nonNullable } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { getSigningPayloads } from '@/shared/transactions';
import { multisigOperationService } from '@/domains/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { wireDraftCloseRedirect } from '@/features/drafts';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { unstakeConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStore, type UnstakeStore, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $unstakeStore = createStore<UnstakeStore | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    store: $unstakeStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return null;

    return walletUtils.getWalletById(wallets, store.initiator.walletId) ?? null;
  },
);

sample({
  clock: flowStarted,
  target: formModel.events.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModel.output.formSubmitted,
  fn: ({ transaction, formData }) => {
    return {
      coreTx: transaction,
      unstakeStore: formData,
    };
  },
  target: spread({
    coreTx: $coreTx,
    unstakeStore: $unstakeStore,
  }),
});

const formSubmitted = sample({
  clock: formModel.output.formSubmitted,
  source: {
    networkStore: $networkStore,
    coreTx: $coreTx,
    api: formModel.$api,
    tx: formModel.$tx,
  },
  fn: (source, { formData }) => {
    return {
      ...source,
      formData,
    };
  },
}).filterMap(({ formData, tx, networkStore, api, coreTx }) => {
  if (
    nonNullable(formData.initiator) &&
    nonNullable(formData.signatory) &&
    nonNullable(coreTx) &&
    nonNullable(networkStore) &&
    nonNullable(api) &&
    nonNullable(tx)
  ) {
    return [
      {
        ...formData,
        initiator: formData.initiator,
        signatory: formData.signatory,
        chain: networkStore.chain,
        asset: getRelaychainAsset(networkStore.chain.assets)!,
        api: api,
        tx: tx,
        coreTx: coreTx,
      },
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

// The open confirm step keeps up with the form's transaction (see `follow`).
// The form hands its wrapped transaction over as this flow's `coreTx` too, so
// both slots follow the same store.
confirmModel.follow({
  clock: formModel.$tx,
  $active: $step.map((step) => step === Step.CONFIRM),
  $transaction: combine({
    tx: formModel.$tx,
    coreTx: formModel.$tx,
    route: formModel.$route,
    signingPath: formModel.$signingPath,
  }),
});

sample({
  clock: confirmModel.confirmed,
  source: {
    unstakeStore: $unstakeStore,
    networkStore: $networkStore,
  },
  filter: ({ unstakeStore, networkStore }) => nonNullable(unstakeStore) && nonNullable(networkStore),
  fn: (_, confirms) => ({
    event: { signingPayloads: getSigningPayloads(confirms) },
    step: Step.SIGN,
  }),
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

const signSubmitted = sample({
  clock: signModel.output.formSubmitted,
  source: {
    unstakeStore: $unstakeStore,
    networkStore: $networkStore,
    confirms: confirmModel.$confirmed,
  },
  fn: (source, signParams) => ({
    ...source,
    signParams,
  }),
}).filterMap(({ unstakeStore, confirms, networkStore, signParams }) => {
  if (nonNullable(unstakeStore) && confirms.length > 0 && nonNullable(networkStore)) {
    return {
      ...signParams,
      chain: networkStore.chain,
      account: unstakeStore.initiator,
      signatory: unstakeStore.signatory,
      wrappedTxs: confirms.map((confirm) => confirm.tx),
      coreTxs: confirms.map((confirm) => confirm.coreTx),
    };
  }
});

sample({
  clock: signSubmitted,
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
  target: [stepChanged, formModel.form.reset],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { isMultisig: formModel.$isMultisig, confirms: confirmModel.$confirmed },
  filter: ({ isMultisig, confirms }, results) =>
    isMultisig && confirms.length > 0 && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ confirms }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;
    const { coreTx, tx } = confirms[0]!;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx.chainId,
      callHash: tx.args.callHash,
      multisigAccountId: coreTx.accountId,
      blockCreated: timepoint.height,
      indexCreated: timepoint.index,
    });
  },
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

wireDraftCloseRedirect({
  $initiatedDraft: formModel.$initiatedDraft,
  flowFinished,
  redirectTarget: $redirectAfterSubmitPath,
  destination: Paths.OPERATIONS,
});

sample({
  clock: txSaved,
  source: {
    coreTx: $coreTx,
    route: formModel.$route,
  },
  fn: ({ coreTx, route }) => {
    if (!coreTx) return [];

    return [
      {
        initiatorAccountId: coreTx.accountId,
        coreTx,
        route,
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

export const unstakeFlow = {
  $step,
  $networkStore,
  $initiatorWallet,

  events: {
    flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
