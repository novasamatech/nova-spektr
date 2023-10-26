import { createStore, sample } from 'effector';

import { walletConnectModel } from '@renderer/entities/walletConnect';
import { Step } from '../common/const';

const $step = createStore(Step.SCAN).reset(walletConnectModel.events.disconnectCurrentSessionStarted);

sample({
  clock: walletConnectModel.events.connected,
  fn: () => Step.MANAGE,
  target: $step,
});

sample({
  clock: walletConnectModel.events.connectionRejected,
  fn: () => Step.REJECT,
  target: $step,
});

export const wcOnboardingModel = {
  $step,
};
