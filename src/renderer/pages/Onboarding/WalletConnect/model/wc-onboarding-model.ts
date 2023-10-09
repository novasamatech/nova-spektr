import { createEvent, createStore, sample } from 'effector';

import { wcModel } from '@renderer/entities/walletConnect';
import { Step } from '../common/const';

const startOnboarding = createEvent();

const $step = createStore(Step.SCAN).reset(startOnboarding);

sample({
  clock: wcModel.events.connected,
  fn: () => Step.MANAGE,
  target: $step,
});

sample({
  clock: wcModel.events.rejectConnection,
  fn: () => Step.REJECT,
  target: $step,
});

export const wcOnboardingModel = {
  $step,
  events: {
    startOnboarding,
  },
};
