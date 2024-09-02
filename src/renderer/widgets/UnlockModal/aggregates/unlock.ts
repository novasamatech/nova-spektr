import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type BasketTransaction, type Transaction } from '@/shared/core';
import { type PathType, Paths } from '@/shared/routes';
import { type ClaimChunkWithAddress, UnlockChunkType } from '@shared/api/governance';
import { Step, isStep, nonNullable } from '@shared/lib/utils';
import { basketModel } from '@/entities/basket';
import { walletModel, walletUtils } from '@/entities/wallet';
import { navigationModel } from '@/features/navigation';
import { locksModel } from '@features/governance/model/locks';
import { networkSelectorModel } from '@features/governance/model/networkSelector';
import { unlockModel } from '@features/governance/model/unlock/unlock';
import { type UnlockFormData } from '@features/governance/types/structs';
import { signModel } from '@features/operations/OperationSign/model/sign-model';
import { ExtrinsicResult, submitModel } from '@features/operations/OperationSubmit';
import { submitUtils } from '@features/operations/OperationSubmit/lib/submit-utils';

import { unlockConfirmAggregate } from './unlockConfirm';
import { unlockFormAggregate } from './unlockForm';

const flowStarted = createEvent();
const flowFinished = createEvent();

const stepChanged = createEvent<Step>();
const unlockFormStarted = createEvent();
const txSaved = createEvent();

const $unlockData = createStore<UnlockFormData | null>(null).reset(flowFinished);
const $wrappedTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $multisigTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $coreTxs = createStore<Transaction[] | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

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
  clock: stepChanged,
  target: $step,
});

sample({
  clock: unlockFormStarted,
  source: unlockModel.$claimSchedule,
  filter: (claims) => nonNullable(claims),
  fn: (claims) => claims!.filter((claim) => claim.type === UnlockChunkType.CLAIMABLE) as ClaimChunkWithAddress[],
  target: unlockFormAggregate.events.formInitiated,
});

sample({
  clock: unlockFormAggregate.output.formSubmitted,
  fn: ({ transactions, formData }) => {
    const wrappedTxs = transactions.map((tx) => tx.wrappedTx);
    const multisigTxs = transactions.map((tx) => tx.multisigTx).filter(nonNullable);
    const coreTxs = transactions.map((tx) => ({
      ...tx.coreTx,
      args: { ...tx.coreTx.args, assetId: formData.asset.assetId },
    }));

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

      return !unlockData!.shards.some(
        (shard) => (shard.address || unlockData!.proxiedAccount?.address) === chunk.address,
      );
    });
  },
  target: [unlockModel.$claimSchedule, locksModel.events.subscribeLocks],
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, unlockFormAggregate.events.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    wallet: walletModel.$activeWallet,
  },
  filter: ({ wallet }, results) => walletUtils.isMultisig(wallet) && results[0].result === ExtrinsicResult.SUCCESS,
  fn: () => Paths.OPERATIONS,
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

// Basket

sample({
  clock: txSaved,
  source: {
    unlockData: $unlockData,
    coreTxs: $coreTxs,
    txWrappers: unlockFormAggregate.$txWrappers,
  },
  filter: ({ unlockData, coreTxs, txWrappers }: any) => {
    return !!unlockData && !!coreTxs && !!txWrappers;
  },
  fn: ({ unlockData, coreTxs, txWrappers }) => {
    const txs = coreTxs!.map(
      (coreTx) =>
        ({
          initiatorWallet: unlockData!.shards[0].walletId,
          coreTx,
          txWrappers,
          groupId: Date.now(),
        }) as BasketTransaction,
    );

    return txs;
  },
  target: basketModel.events.transactionsCreated,
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
