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
import { restakeConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type RestakeConfirm } from '@/features/operations/OperationsConfirm/Restake/model/confirm-model';
import { type NetworkStore, type RestakeStoreShards, Step } from '../lib/types';

import { formModelShards } from './form-model-shards';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<NetworkStore>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $restakeStore = createStore<RestakeStoreShards | null>(null).reset(flowFinished);
const $networkStore = restore<NetworkStore | null>(flowStarted, null);

const $coreTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

const $initiatorWallet = combine(
  {
    store: $restakeStore,
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
      restakeStore: formData,
    };
  },
  target: spread({
    coreTxs: $coreTxs,
    restakeStore: $restakeStore,
  }),
});

sample({
  clock: formModelShards.output.formSubmitted,
  source: $networkStore,
  filter: (networkStore) => Boolean(networkStore),
  fn: (networkStore, { formData, transactions }) => ({
    // One item per shard, each holding the transaction that shard signs.
    event: transactions.map(({ wrappedTx, coreTx }, index) => {
      const shard = formData.shards[index]!;

      return {
        ...formData,
        chain: networkStore!.chain,
        asset: getRelaychainAsset(networkStore!.chain.assets)!,
        coreTx,
        initiator: shard,
        signatory: formData.signatory ?? shard,
        route: [shard],
        tx: wrappedTx,
      } satisfies RestakeConfirm;
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
    restakeStore: $restakeStore,
    networkStore: $networkStore,
  },
  filter: ({ restakeStore, networkStore }) => Boolean(restakeStore) && Boolean(networkStore),
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
    restakeStore: $restakeStore,
    networkStore: $networkStore,
    confirms: confirmModel.$confirmed,
  },
  filter: (transferData) => {
    return Boolean(transferData.restakeStore) && transferData.confirms.length > 0 && Boolean(transferData.networkStore);
  },
  fn: (transferData, signParams) => ({
    event: {
      ...signParams,
      chain: transferData.networkStore!.chain,
      account: transferData.restakeStore!.shards[0]!,
      signatory: transferData.restakeStore!.signatory,
      wrappedTxs: transferData.confirms.map((confirm) => confirm.tx),
      coreTxs: transferData.confirms.map((confirm) => confirm.coreTx),
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
    coreTxs: $coreTxs,
  },
  filter: ({ coreTxs }) => nonNullable(coreTxs),
  fn: ({ coreTxs }) => {
    return (coreTxs ?? []).map((coreTx) => ({
      initiatorAccountId: coreTx.accountId,
      coreTx,
      route: [],
      createdAt: Date.now(),
    }));
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const restakeFlowShards = {
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
