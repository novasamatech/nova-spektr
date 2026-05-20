import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { getRelaychainAsset, nonNullable } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { multisigOperationService } from '@/domains/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { wireDraftCloseRedirect } from '@/features/drafts';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { type WithdrawConfirm, withdrawConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStore, type WithdrawData, Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $withdrawData = createStore<WithdrawData | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    store: $withdrawData,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store || !store.initiator) return null;

    return walletUtils.getWalletById(wallets, store.initiator.walletId);
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
  fn: ({ formData }) => formData,
  target: $withdrawData,
});

sample({
  clock: formModel.output.formSubmitted,
  source: {
    networkStore: $networkStore,
    coreTx: formModel.$coreTx,
    route: formModel.$route,
    tx: formModel.$tx,
    signingPath: formModel.$signingPath,
  },
  filter: ({ networkStore }, { formData }) => {
    return nonNullable(networkStore) && nonNullable(formData.initiator) && nonNullable(formData.signatory);
  },
  fn: ({ networkStore, coreTx, route, tx, signingPath }, { formData }) => {
    return {
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
          signingPath,
        } satisfies WithdrawConfirm,
      ],
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigning,
  source: {
    withdrawData: $withdrawData,
    networkStore: $networkStore,
    wrappedTx: formModel.$tx,
  },
  filter: ({ withdrawData, networkStore, wrappedTx }) => {
    return (
      nonNullable(withdrawData) &&
      nonNullable(networkStore) &&
      nonNullable(wrappedTx) &&
      nonNullable(withdrawData?.initiator)
    );
  },
  fn: ({ withdrawData, networkStore, wrappedTx }) => ({
    event: {
      signingPayloads: [
        {
          chain: networkStore!.chain,
          account: withdrawData!.initiator!,
          signatory: withdrawData!.signatory,
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
    withdrawData: $withdrawData,
    networkStore: $networkStore,
    coreTx: formModel.$coreTx,
    wrappedTx: formModel.$tx,
  },
  filter: ({ withdrawData, networkStore, wrappedTx, coreTx }) => {
    return (
      nonNullable(withdrawData) &&
      nonNullable(wrappedTx) &&
      nonNullable(coreTx) &&
      nonNullable(networkStore) &&
      nonNullable(withdrawData?.initiator) &&
      nonNullable(withdrawData?.signatory)
    );
  },
  fn: ({ withdrawData, networkStore, coreTx, wrappedTx }, signParams) => ({
    event: {
      ...signParams,
      chain: networkStore!.chain,
      account: withdrawData!.initiator!,
      signatory: withdrawData!.signatory,
      coreTxs: [coreTx!],
      wrappedTxs: [wrappedTx!],
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
  target: [stepChanged, formModel.events.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { isMultisig: formModel.$isMultisig, coreTx: formModel.$coreTx, wrappedTx: formModel.$tx },
  filter: ({ isMultisig }, results) => isMultisig && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ coreTx, wrappedTx }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx!.chainId,
      callHash: wrappedTx!.args.callHash,
      multisigAccountId: coreTx!.accountId,
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
    store: $withdrawData,
    coreTx: formModel.$coreTx,
    route: formModel.$route,
  },
  filter: ({ store, coreTx }) => {
    return nonNullable(store) && nonNullable(coreTx);
  },
  fn: ({ store, coreTx, route }) => [
    {
      initiatorAccountId: store!.initiator!.accountId,
      coreTx: coreTx!,
      route,
      createdAt: Date.now(),
    },
  ],
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const withdrawFlow = {
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
