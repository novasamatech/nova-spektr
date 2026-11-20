import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Transaction } from '@/shared/core';
import { getRelaychainAsset, nonNullable } from '@/shared/lib/utils';
import { getSigningPayloads } from '@/shared/transactions';
import { multisigOperationService } from '@/domains/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { type WithdrawConfirm, withdrawConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type NetworkStore, type WithdrawDataShards, Step } from '../lib/types';

import { formModelShards } from './form-model-shards';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $withdrawData = createStore<WithdrawDataShards | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $coreTxs = createStore<Transaction[] | null>(null).reset(flowFinished);

const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    store: $withdrawData,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.shards[0]!.walletId);
  },
  { skipVoid: false },
);

sample({
  clock: flowStarted,
  target: formModelShards.events.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModelShards.output.formSubmitted,
  fn: ({ transactions, formData }) => {
    const coreTxs = transactions.map((tx) => tx.coreTx);

    return {
      coreTxs,
      store: formData,
    };
  },
  target: spread({
    coreTxs: $coreTxs,
    store: $withdrawData,
  }),
});

sample({
  clock: formModelShards.output.formSubmitted,
  source: $networkStore,
  filter: (networkStore) => nonNullable(networkStore),
  fn: (networkStore, { formData, transactions }) => ({
    // One item per shard, each holding the transaction that shard signs.
    event: transactions.map(({ wrappedTx, coreTx }, index) => {
      const shard = formData.shards[index]!;

      return {
        ...formData,
        signatory: formData.signatory ?? shard,
        initiator: shard,
        route: [shard],
        tx: wrappedTx,
        chain: networkStore!.chain,
        asset: getRelaychainAsset(networkStore!.chain.assets)!,
        coreTx,
      } satisfies WithdrawConfirm;
    }),
    step: Step.CONFIRM,
  }),
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.confirmed,
  source: {
    withdrawData: $withdrawData,
    networkStore: $networkStore,
  },
  filter: ({ withdrawData, networkStore }) => nonNullable(withdrawData) && nonNullable(networkStore),
  fn: (_, confirms) => ({
    event: { signingPayloads: getSigningPayloads(confirms) },
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
    confirms: confirmModel.$confirmed,
  },
  filter: (withdrawData) => {
    return (
      nonNullable(withdrawData.withdrawData) &&
      withdrawData.confirms.length > 0 &&
      nonNullable(withdrawData.networkStore)
    );
  },
  fn: (withdrawData, signParams) => ({
    event: {
      ...signParams,
      chain: withdrawData.networkStore!.chain,
      account: withdrawData.withdrawData!.shards[0]!,
      signatory: withdrawData.withdrawData!.signatory,
      coreTxs: withdrawData.confirms.map((confirm) => confirm.coreTx),
      wrappedTxs: withdrawData.confirms.map((confirm) => confirm.tx),
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
  target: [stepChanged, formModelShards.events.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { isMultisig: formModelShards.$isMultisig, confirms: confirmModel.$confirmed },
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

sample({
  clock: txSaved,
  source: {
    store: $withdrawData,
    coreTxs: $coreTxs,
  },
  filter: ({ store, coreTxs }) => {
    return nonNullable(store) && nonNullable(coreTxs);
  },
  fn: ({ store, coreTxs }) =>
    coreTxs!.map((coreTx) => ({
      initiatorAccountId: store!.shards[0]!.accountId,
      coreTx,
      route: [],
      createdAt: Date.now(),
    })),
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const withdrawFlowShards = {
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
