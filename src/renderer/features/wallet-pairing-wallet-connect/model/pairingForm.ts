import { createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { nonNullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { walletConnectModel, walletConnectUtils } from '@/entities/walletConnect';
import { Step } from '../lib/constants';

const reset = createEvent();
const flow = createGate<'novawallet' | 'walletconnect' | null>({ defaultState: null });
const $step = createStore(Step.SCAN).reset(reset);

sample({
  clock: reset,
  target: walletConnectModel.events.disconnectCurrentSessionStarted,
});

sample({
  clock: flow.open,
  source: { provider: walletConnectModel.$provider, chains: networkModel.$chains },
  filter: ({ provider }) => nonNullable(provider),
  fn: ({ chains }) => ({ chains: walletConnectUtils.getWalletConnectChains(Object.values(chains)) }),
  target: walletConnectModel.events.connect,
});

sample({
  clock: flow.open,
  fn: () => Step.SCAN,
  target: $step,
});

sample({
  clock: walletConnectModel.events.connected,
  source: $step,
  filter: step => step === Step.SCAN,
  fn: () => Step.MANAGE,
  target: $step,
});

sample({
  clock: walletConnectModel.events.connectionRejected,
  source: $step,
  filter: step => step === Step.SCAN,
  fn: () => Step.REJECT,
  target: $step,
});

export const pairingForm = {
  flow,
  $step,
  reset,
};
