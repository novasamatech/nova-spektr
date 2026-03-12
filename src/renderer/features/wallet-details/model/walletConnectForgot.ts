import { createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Wallet } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';
import { accountUtils, walletModel } from '@/entities/wallet';
import { walletConnect } from '@/features/wallet-connect-wallet';
import { ForgetStep } from '../lib/constants';

const flow = createGate<{ accounts: AnyAccount[] }>({ defaultState: { accounts: [] } });

const forget = createEvent<Wallet>();
const abort = createEvent();

const $forgetStep = createStore<ForgetStep>(ForgetStep.NOT_STARTED).reset(flow.close);

// TODO simplify
sample({
  clock: forget,
  fn: wallet => {
    const account = wallet.accounts.at(0);
    if (!account || !accountUtils.isWcAccount(account)) {
      throw new Error('Not Wallet Connect account.');
    }

    return {
      pairingTopic: account.signingExtras.pairingTopic ?? '',
    };
  },
  target: [walletConnect.removePairing, walletConnect.removeSession],
});

sample({
  clock: forget,
  fn: () => ForgetStep.FORGETTING,
  target: $forgetStep,
});

sample({
  clock: [flow.close, abort],
  fn: () => ForgetStep.NOT_STARTED,
  target: $forgetStep,
});

sample({
  clock: forget,
  filter: wallet => wallet.accounts.length > 0,
  fn: wallet => wallet.accounts[0]!.walletId,
  target: walletModel.events.removeWallet,
});

sample({
  clock: walletModel.events.walletRemovedSuccess,
  source: { forgetStep: $forgetStep },
  filter: ({ forgetStep }) => forgetStep !== ForgetStep.NOT_STARTED,
  fn: () => ForgetStep.SUCCESS,
  target: $forgetStep,
});

export const walletConnectForget = {
  $forgetStep,
  forget,
  flow,
  abort,
};
