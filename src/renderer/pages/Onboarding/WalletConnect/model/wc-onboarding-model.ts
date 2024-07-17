import { createEvent, createStore, sample } from 'effector';

import { walletConnectModel } from '@entities/walletConnect';

import { Step } from '../lib/constants';

const $step = createStore(Step.CLOSED).reset([walletConnectModel.events.disconnectCurrentSessionStarted]);

const onboardingStarted = createEvent();

sample({
  clock: onboardingStarted,
  fn: () => Step.SCAN,
  target: $step,
});

sample({
  clock: walletConnectModel.events.connected,
  source: $step,
  filter: (step) => step === Step.SCAN,
  fn: () => Step.MANAGE,
  target: $step,
});

sample({
  clock: walletConnectModel.events.connectionRejected,
  source: $step,
  filter: (step) => step === Step.SCAN,
  fn: () => Step.REJECT,
  target: $step,
});

export const wcOnboardingModel = {
  $step,
  events: {
    onboardingStarted,
  },
};
