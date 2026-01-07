import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type ClaimChunkWithAccountId, UnlockChunkType } from '@/shared/api/governance';
import { type Transaction } from '@/shared/core';
import { Step, isStep, nonNullable } from '@/shared/lib/utils';
import { basketOperations } from '@/aggregates/basket-operations';
import { networkSelectorModel } from '@/features/governance';
import { locksModel } from '@/features/governance/model/locks';
import { unlockModel } from '@/features/governance/model/unlock/unlock';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';
import { submitUtils } from '@/features/operations/OperationSubmit/lib/submit-utils';
import { type UnlockConfirm, unlockConfirmModel } from '@/features/operations/OperationsConfirm';
import { type UnlockFormData } from '../lib/types';

import { unlockFormAggregate } from './unlockForm';

const flowStarted = createEvent();
const flowFinished = createEvent();

const stepChanged = createEvent<Step>();
const unlockFormStarted = createEvent();
const txSaved = createEvent();

const $unlockData = createStore<UnlockFormData | null>(null).reset(flowFinished);
const $wrappedTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $coreTxs = createStore<Transaction[] | null>(null).reset(flowFinished);

const $step = restore<Step>(stepChanged, Step.NONE);

const $pendingSchedule = combine(unlockModel.$claimSchedule, (chunks) =>
  (chunks || []).filter((claim) => claim.type !== UnlockChunkType.CLAIMABLE),
);

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: unlockFormStarted,
  fn: () => Step.SELECT,
  target: stepChanged,
});

sample({
  clock: unlockFormStarted,
  source: unlockModel.$claimSchedule,
  filter: (claims) => nonNullable(claims),
  fn: (claims) => claims!.filter((claim) => claim.type === UnlockChunkType.CLAIMABLE) as ClaimChunkWithAccountId[],
  target: unlockFormAggregate.formInitiated,
});

sample({
  clock: unlockFormAggregate.formSubmitted,
  fn: ({ transactions, formData }) => {
    const wrappedTxs = transactions.map((tx) => tx.wrappedTx);
    const coreTxs = transactions.map((tx) => ({
      ...tx.coreTx,
      args: { ...tx.coreTx.args, assetId: formData.asset.assetId },
    }));

    return {
      wrappedTxs,
      coreTxs,
      unlockData: formData,
    };
  },
  target: spread({
    wrappedTxs: $wrappedTxs,
    coreTxs: $coreTxs,
    unlockData: $unlockData,
  }),
});

sample({
  clock: unlockFormAggregate.formSubmitted,
  fn: ({ transactions, formData }) => ({
    event: [
      {
        ...formData,
        initiator: formData.initiator!,
        signatory: formData.signatory!,
        coreTx: transactions[0]!.coreTx,
        route: [formData.initiator!],
        tx: transactions[0]!.coreTx,
      } satisfies UnlockConfirm,
    ],
    step: Step.CONFIRM,
  }),
  target: spread({
    event: unlockConfirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: unlockConfirmModel.startSigning,
  source: {
    unlockData: $unlockData,
    chain: networkSelectorModel.$governanceChain,
    wrappedTxs: $wrappedTxs,
  },
  filter: ({ unlockData, chain, wrappedTxs }) => {
    return nonNullable(unlockData) && nonNullable(chain) && nonNullable(wrappedTxs);
  },
  fn: ({ unlockData, chain, wrappedTxs }) => ({
    event: {
      signingPayloads: wrappedTxs!.map((tx, index) => ({
        chain: chain!,
        account: unlockData!.shards[index]!,
        signatory: unlockData!.signatory,
        transaction: tx!,
      })),
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
    unlockData: $unlockData,
    chain: networkSelectorModel.$governanceChain,
    coreTxs: $coreTxs,
    wrappedTxs: $wrappedTxs,
    step: $step,
  },
  filter: (unlockData) => {
    return (
      isStep(unlockData.step, Step.SIGN) &&
      !!unlockData.unlockData &&
      !!unlockData.wrappedTxs &&
      !!unlockData.coreTxs &&
      !!unlockData.chain
    );
  },
  fn: (unlockData, signParams) => {
    return {
      event: {
        ...signParams,
        chain: unlockData.chain!,
        account: unlockData.unlockData!.shards[0]!,
        signatory: unlockData.unlockData!.signatory,
        coreTxs: unlockData.coreTxs!,
        wrappedTxs: unlockData.wrappedTxs!,
      },
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: submitModel.$submitStep,
  source: {
    chunks: unlockModel.$claimSchedule,
    chain: networkSelectorModel.$governanceChain,
    unlockData: $unlockData,
    step: $step,
  },
  filter: ({ unlockData, step, chain }, { step: submitStep }) =>
    !!unlockData &&
    isStep(step, Step.SUBMIT) &&
    submitUtils.isSuccessStep(submitStep) &&
    chain?.chainId === unlockData.chain.chainId,
  fn: ({ chunks, unlockData }) => {
    return (chunks || []).filter((chunk) => {
      if (chunk.type !== UnlockChunkType.CLAIMABLE) return true;

      return !unlockData!.shards.some((shard) => {
        const accountId = shard.accountId || unlockData!.proxiedAccount?.accountId;

        return accountId === chunk.accountId;
      });
    });
  },
  target: [unlockModel.$claimSchedule, locksModel.events.subscribeLocks],
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, unlockFormAggregate.formCleared],
});

// Basket

sample({
  clock: txSaved,
  source: {
    unlockData: $unlockData,
    coreTxs: $coreTxs,
  },
  filter: ({ coreTxs }) => {
    return !!coreTxs;
  },
  fn: ({ coreTxs }) =>
    coreTxs!.map((coreTx) => ({
      initiatorAccountId: coreTx.accountId,
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

export const unlockAggregate = {
  $step,
  $isLoading: unlockModel.$isLoading,
  $isUnlockable: unlockModel.$isUnlockable,
  $pendingSchedule,

  flowStarted,
  stepChanged,
  unlockFormStarted,
  txSaved,
  flowFinished,
};
