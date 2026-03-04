import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type ClaimChunkWithAccountId, UnlockChunkType } from '@/shared/api/governance';
import { Step, isStep, nonNullable } from '@/shared/lib/utils';
import { multisigOperationService } from '@/domains/network';
import { basketOperations } from '@/aggregates/basket-operations';
import { networkSelectorModel } from '@/features/governance';
import { locksModel } from '@/features/governance/model/locks';
import { unlockModel } from '@/features/governance/model/unlock/unlock';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { type UnlockConfirm, unlockConfirmModel } from '@/features/operations/OperationsConfirm';
import { type UnlockFormData } from '../lib/types';

import { unlockFormAggregate } from './unlockForm';

const flowStarted = createEvent();
const flowFinished = createEvent();

const stepChanged = createEvent<Step>();
const unlockFormStarted = createEvent();
const txSaved = createEvent();

const $unlockData = createStore<UnlockFormData | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

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
  target: $unlockData,
});

const formSubmitted = sample({
  clock: unlockFormAggregate.formSubmitted,
  source: {
    coreTx: unlockFormAggregate.$coreTx,
    tx: unlockFormAggregate.$tx,
    route: unlockFormAggregate.$route,
  },
  fn: (source, formData) => ({ source, formData }),
}).filterMap(({ source: { coreTx, tx, route }, formData }) => {
  if (
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
        coreTx,
        route,
        tx,
      } satisfies UnlockConfirm,
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
    event: unlockConfirmModel.init,
    step: stepChanged,
  }),
});

const startSigning = sample({
  clock: unlockConfirmModel.startSigning,
  source: {
    unlockData: $unlockData,
    chain: networkSelectorModel.$governanceChain,
    tx: unlockFormAggregate.$tx,
  },
}).filterMap(({ unlockData, chain, tx }) => {
  if (nonNullable(unlockData) && nonNullable(chain) && nonNullable(tx)) {
    return {
      signingPayloads: [
        {
          chain: chain!,
          account: unlockData!.initiator!,
          signatory: unlockData!.signatory,
          transaction: tx!,
        },
      ],
    };
  }
});

sample({
  clock: startSigning,
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
    unlockData: $unlockData,
    chain: networkSelectorModel.$governanceChain,
    coreTx: unlockFormAggregate.$coreTx,
    tx: unlockFormAggregate.$tx,
    step: $step,
  },
  fn: (source, signParams) => ({ source, signParams }),
}).filterMap(({ source, signParams }) => {
  if (
    isStep(source.step, Step.SIGN) &&
    nonNullable(source.unlockData?.initiator) &&
    nonNullable(source.unlockData?.signatory) &&
    nonNullable(source.tx) &&
    nonNullable(source.coreTx) &&
    nonNullable(source.chain)
  ) {
    return {
      ...signParams,
      chain: source.chain,
      account: source.unlockData.initiator,
      signatory: source.unlockData.signatory,
      coreTxs: [source.coreTx],
      wrappedTxs: [source.tx],
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
  clock: submitModel.$submitStep,
  source: {
    chunks: unlockModel.$claimSchedule,
    chain: networkSelectorModel.$governanceChain,
    unlockData: $unlockData,
    step: $step,
  },
  filter: ({ unlockData, step, chain }, { step: submitStep }) =>
    nonNullable(unlockData) &&
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
  source: {
    isMultisig: unlockFormAggregate.$isMultisig,
    coreTx: unlockFormAggregate.$coreTx,
    wrappedTx: unlockFormAggregate.$tx,
  },
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

// Basket

sample({
  clock: txSaved,
  source: {
    unlockData: $unlockData,
    coreTx: unlockFormAggregate.$coreTx,
    route: unlockFormAggregate.$route,
  },
  filter: ({ unlockData, coreTx }) => nonNullable(unlockData?.initiator) && nonNullable(coreTx),
  fn: ({ unlockData, coreTx, route }) => [
    {
      initiatorAccountId: unlockData!.initiator!.accountId,
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
