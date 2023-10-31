import { createEvent, createStore, forward, sample } from 'effector';
import { combineEvents } from 'patronum';

import { walletConnectModel, type InitReconnectParams } from '@renderer/entities/walletConnect';
import { toAccountId } from '@renderer/shared/lib/utils';
import { chainsService } from '@renderer/entities/network';
import { WalletConnectAccount } from '@renderer/shared/core';
import { ReconnectStep } from '../lib/constants';
import { walletModel } from '@renderer/entities/wallet';
import { isConnectedStep, isReconnectingStep } from '../lib/utils';
import { signModel } from './sign-model';

const reset = createEvent();
const reconnectModalShown = createEvent();
const reconnectStarted = createEvent<InitReconnectParams>();
const reconnectAborted = createEvent();
const reconnectDone = createEvent();

const $reconnectStep = createStore(ReconnectStep.NOT_STARTED).reset(reset);

sample({
  clock: reconnectModalShown,
  fn: () => ReconnectStep.READY_TO_RECONNECT,
  target: $reconnectStep,
});

sample({
  clock: reconnectStarted,
  fn: () => ReconnectStep.RECONNECTING,
  target: $reconnectStep,
});

forward({
  from: reconnectStarted,
  to: walletConnectModel.events.connect,
});

sample({
  clock: walletConnectModel.events.connected,
  source: {
    step: $reconnectStep,
    session: walletConnectModel.$session,
  },
  filter: ({ step, session }) => isReconnectingStep(step) || (isConnectedStep(step) && Boolean(session?.topic)),
  fn: ({ session }) => {
    return session?.topic!;
  },
  target: walletConnectModel.events.currentSessionTopicUpdated,
});

sample({
  clock: combineEvents({
    events: [reconnectStarted, walletConnectModel.events.sessionTopicUpdateDone, walletConnectModel.events.connected],
  }),
  source: {
    newAccounts: walletConnectModel.$accounts,
    signer: signModel.$signer,
    accounts: walletModel.$accounts,
  },
  filter: ({ signer }) => Boolean(signer?.walletId),
  fn: ({ signer, accounts, newAccounts }) => {
    const { id, ...oldAccountParams } = signer!;

    const updatedAccounts = newAccounts.map((account) => {
      const [_, chainId, address] = account.split(':');
      const chain = chainsService.searchChain(chainId);
      const accountId = toAccountId(address);

      return {
        ...oldAccountParams,
        chainId: chain?.chainId,
        accountId,
      } as WalletConnectAccount;
    });

    return {
      walletId: signer?.walletId!,
      accounts,
      newAccounts: updatedAccounts,
    };
  },
  target: walletConnectModel.events.accountsUpdated,
});

sample({
  clock: walletConnectModel.events.connectionRejected,
  source: $reconnectStep,
  filter: (step) => step === ReconnectStep.RECONNECTING,
  fn: () => ReconnectStep.REJECTED,
  target: $reconnectStep,
});

sample({
  clock: walletConnectModel.events.accountsUpdateDone,
  fn: () => ReconnectStep.SUCCESS,
  target: $reconnectStep,
});

sample({
  clock: [reconnectAborted, reconnectDone],
  fn: () => ReconnectStep.NOT_STARTED,
  target: $reconnectStep,
});

export const walletConnectSignModel = {
  $reconnectStep,
  events: {
    reset,
    reconnectModalShown,
    reconnectStarted,
    reconnectAborted,
    reconnectDone,
  },
};
