import { combine, createEvent, createStore, restore, sample } from 'effector';
import { delay, or, spread } from 'patronum';

import { type Transaction } from '@/shared/core';
import { type ClaimChunkWithAddress, UnlockChunkType } from '@shared/api/governance';
import { Step, isStep, nonNullable } from '@shared/lib/utils';
import { referendumModel } from '@/entities/governance';
import { signModel } from '../../operations/OperationSign/model/sign-model';
import { submitModel } from '../../operations/OperationSubmit';
import { submitUtils } from '../../operations/OperationSubmit/lib/submit-utils';
import { networkSelectorModel } from '../model/networkSelector';
import { unlockModel } from '../model/unlock/unlock';
import { type UnlockFormData } from '../types/structs';

import { locksModel } from './../model/locks';
import { unlockConfirmAggregate } from './unlockConfirm';
import { unlockFormAggregate } from './unlockForm';

const flowStarted = createEvent();
const flowFinished = createEvent();

const stepChanged = createEvent<Step>();
const unlockFormStarted = createEvent();
const txSaved = createEvent();

const $unlockData = createStore<UnlockFormData | null>(null).reset(flowFinished);
const $wrappedTxs = createStore<Transaction[] | null>(null);
const $multisigTxs = createStore<Transaction[] | null>(null);
const $coreTxs = createStore<Transaction[] | null>(null);

const $step = restore<Step>(stepChanged, Step.NONE);

const $pendingSchedule = combine(unlockModel.$claimSchedule, (chunks) =>
  chunks.filter((claim) => claim.type !== UnlockChunkType.CLAIMABLE),
);

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

sample({
  clock: unlockFormStarted,
  fn: () => Step.SELECT,
  target: stepChanged,
});

sample({
  clock: stepChanged,
  target: $step,
});

sample({
  clock: unlockFormStarted,
  source: unlockModel.$claimSchedule,
  fn: (claims) => claims.filter((claim) => claim.type === UnlockChunkType.CLAIMABLE) as ClaimChunkWithAddress[],
  target: unlockFormAggregate.events.formInitiated,
});

sample({
  clock: unlockFormAggregate.output.formSubmitted,
  fn: ({ transactions, formData }) => {
    const wrappedTxs = transactions.map((tx) => tx.wrappedTx);
    const multisigTxs = transactions.map((tx) => tx.multisigTx).filter(nonNullable);
    const coreTxs = transactions.map((tx) => tx.coreTx);

    return {
      wrappedTxs,
      multisigTxs: multisigTxs.length === 0 ? null : multisigTxs,
      coreTxs,
      unlockData: formData,
    };
  },
  target: spread({
    wrappedTxs: $wrappedTxs,
    multisigTxs: $multisigTxs,
    coreTxs: $coreTxs,
    unlockData: $unlockData,
  }),
});

sample({
  clock: unlockFormAggregate.output.formSubmitted,
  fn: ({ formData }) => ({
    event: [formData],
    step: Step.CONFIRM,
  }),
  target: spread({
    event: unlockConfirmAggregate.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: unlockConfirmAggregate.output.formSubmitted,
  source: {
    unlockData: $unlockData,
    chain: networkSelectorModel.$governanceChain,
    wrappedTxs: $wrappedTxs,
  },
  filter: ({ unlockData, chain, wrappedTxs }) => {
    return Boolean(unlockData) && Boolean(chain) && Boolean(wrappedTxs);
  },
  fn: ({ unlockData, chain, wrappedTxs }) => ({
    event: {
      signingPayloads: wrappedTxs!.map((tx, index) => ({
        chain: chain!,
        account: unlockData!.shards[index],
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
    multisigTxs: $multisigTxs,
    coreTxs: $coreTxs,
    wrappedTxs: $wrappedTxs,
    step: $step,
  },
  filter: (unlockData) => {
    return (
      !!isStep(unlockData.step, Step.SIGN) &&
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
        account: unlockData.unlockData!.shards[0],
        signatory: unlockData.unlockData!.signatory,
        description: unlockData.unlockData!.description,
        coreTxs: unlockData.coreTxs!,
        wrappedTxs: unlockData.wrappedTxs!,
        multisigTxs: unlockData.multisigTxs || [],
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
  clock: delay(submitModel.output.formSubmitted, 2000),
  source: $step,
  filter: (step) => isStep(step, Step.SUBMIT),
  target: flowFinished,
});

sample({
  clock: submitModel.$submitStep,
  source: {
    chunks: unlockModel.$claimSchedule,
    unlockData: $unlockData,
  },
  filter: ({ unlockData }, { step }) => !!unlockData && submitUtils.isSuccessStep(step),
  fn: ({ chunks, unlockData }) => {
    return chunks.filter(
      (chunk) =>
        chunk.type === UnlockChunkType.CLAIMABLE && unlockData!.shards.some((shard) => shard.address !== chunk.address),
    );
  },
  target: [unlockModel.$claimSchedule, locksModel.events.getTracksLocks],
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

export const unlockAggregate = {
  $step,
  $totalUnlock: unlockModel.$totalUnlock,
  $isLoading: or(unlockModel.$isLoading, referendumModel.$isReferendumsLoading),
  $isUnlockable: unlockModel.$claimSchedule.map((c) => c.some((claim) => claim.type === UnlockChunkType.CLAIMABLE)),
  $pendingSchedule,

  events: {
    flowStarted,
    stepChanged,
    unlockFormStarted,
    txSaved,
  },

  output: {
    flowFinished,
  },
};
