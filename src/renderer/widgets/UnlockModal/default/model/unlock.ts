import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type ClaimChunkWithAccountId, UnlockChunkType } from '@/shared/api/governance';
import { Step, isStep, nonNullable } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { basketOperations } from '@/aggregates/basket-operations';
import { networkSelectorModel } from '@/features/governance';
import { locksModel } from '@/features/governance/model/locks';
import { unlockModel } from '@/features/governance/model/unlock/unlock';
import { navigationModel } from '@/features/navigation';
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
  fn: (claims) => claims!.filter((claim) => claim.type === UnlockChunkType.CLAIMABLE) as ClaimChunkWithAccountId[],
  target: unlockFormAggregate.formInitiated,
});

sample({
  clock: unlockFormAggregate.formSubmitted,
  target: $unlockData,
});

sample({
  clock: unlockFormAggregate.formSubmitted,
  source: {
    coreTx: unlockFormAggregate.$coreTx,
    tx: unlockFormAggregate.$tx,
  },
  fn: ({ coreTx, tx }, formData) => ({
    event: [
      {
        ...formData,
        initiator: formData.initiator!,
        signatory: formData.signatory!,
        coreTx: coreTx!,
        route: [formData.initiator!],
        tx: tx!,
        multisigTx: null,
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
    tx: unlockFormAggregate.$tx,
  },
  filter: ({ unlockData, chain, tx }) => {
    return nonNullable(unlockData) && nonNullable(chain) && nonNullable(tx);
  },
  fn: ({ unlockData, chain, tx }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: unlockData!.initiator!,
          signatory: unlockData!.signatory,
          transaction: tx!,
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
    unlockData: $unlockData,
    chain: networkSelectorModel.$governanceChain,
    multisigTx: unlockFormAggregate.$multisigTx,
    coreTx: unlockFormAggregate.$coreTx,
    tx: unlockFormAggregate.$tx,
    step: $step,
  },
  filter: (source) => {
    return isStep(source.step, Step.SIGN) && !!source.unlockData && !!source.tx && !!source.coreTx && !!source.chain;
  },
  fn: (source, signParams) => {
    return {
      event: {
        ...signParams,
        chain: source.chain!,
        account: source.unlockData!.initiator!,
        signatory: source.unlockData!.signatory!,
        coreTxs: [source.coreTx!],
        wrappedTxs: [source.tx!],
        multisigTxs: source.multisigTx ? [source.multisigTx] : [],
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

      return unlockData?.initiator?.accountId !== chunk.accountId;
    });
  },
  target: [unlockModel.$claimSchedule, locksModel.events.subscribeLocks],
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, unlockFormAggregate.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: unlockFormAggregate.$isMultisig,
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

// Basket

sample({
  clock: txSaved,
  source: {
    unlockData: $unlockData,
    coreTx: unlockFormAggregate.$coreTx,
  },
  filter: ({ coreTx }) => {
    return !!coreTx;
  },
  fn: ({ coreTx }) => [
    {
      initiatorAccountId: coreTx!.accountId,
      coreTx: coreTx!,
      route: [],
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
