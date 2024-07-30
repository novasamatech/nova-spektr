import { createEvent, restore, sample } from 'effector';
import { or, spread } from 'patronum';

import { type ClaimChunkWithAddress, UnlockChunkType } from '@shared/api/governance';
import { Step } from '@shared/lib/utils';
import { referendumModel } from '@/entities/governance';
import { unlockModel } from '../model/unlock/unlock';

import { unlockConfirmAggregate } from './unlockConfirm';
import { unlockFormAggregate } from './unlockForm';

const flowStarted = createEvent();
const flowFinished = createEvent();

const stepChanged = createEvent<Step>();
const unlockFormStarted = createEvent();
const txSaved = createEvent();

const $step = restore<Step>(stepChanged, Step.NONE);

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
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

export const unlockAggregate = {
  $step,
  $totalUnlock: unlockModel.$totalUnlock,
  $isLoading: or(unlockModel.$isLoading, referendumModel.$isReferendumsLoading),
  $isUnlockable: unlockModel.$claimSchedule.map((c) => c.some((claim) => claim.type === UnlockChunkType.CLAIMABLE)),
  $pendingSchedule: unlockModel.$claimSchedule.map((c) =>
    c.filter((claim) => claim.type !== UnlockChunkType.CLAIMABLE),
  ),

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
