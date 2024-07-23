import { createEvent, restore, sample } from 'effector';
import { or, spread } from 'patronum';

import { UnlockChunkType } from '@shared/api/governance';
import { Step } from '@shared/lib/utils';
import { referendumModel } from '@/entities/governance';
import { unlockModel } from '../model/unlock/unlock';

import { unlockConfirmAggregate } from './unlockConfirm';

const flowStarted = createEvent();
const flowFinished = createEvent();
const stepChanged = createEvent<Step>();
const unlockConfirm = createEvent();
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
  clock: stepChanged,
  target: $step,
});

sample({
  clock: unlockConfirm,
  source: {
    unlockableClaims: unlockModel.$claimSchedule.map((c) =>
      c.filter((claim) => claim.type === UnlockChunkType.CLAIMABLE),
    ),
    totalUnlock: unlockModel.$totalUnlock,
  },
  filter: ({ totalUnlock }) => !totalUnlock.isZero(),
  fn: ({ unlockableClaims, totalUnlock }) => ({
    event: { unlockableClaims, amount: totalUnlock.toString() },
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
    unlockConfirm,
    txSaved,
  },

  output: {
    flowFinished,
  },
};
