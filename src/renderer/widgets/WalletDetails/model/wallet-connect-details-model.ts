import { combine, createEvent, createStore, forward, sample } from 'effector';

import { accountUtils, walletModel } from '@renderer/entities/wallet';
import { InitConnectProps, walletConnectModel } from '@renderer/entities/walletConnect';
import { ReconnectStep } from '../lib/constants';
import { walletProviderModel } from './wallet-provider-model';
import { walletSelectModel } from '@renderer/features/wallets';

const reset = createEvent();
const reconnectStarted = createEvent<Omit<InitConnectProps, 'client'>>();
const reconnectAborted = createEvent();
const sessionTopicUpdated = createEvent();

const $reconnectStep = createStore<ReconnectStep>(ReconnectStep.NOT_STARTED).reset(reset);

const $connected = combine(
  {
    accounts: walletProviderModel.$accounts,
    client: walletConnectModel.$client,
  },
  ({ accounts, client }): boolean => {
    const account = accounts[0];
    if (!client || !account || !accountUtils.isWalletConnectAccount(account)) return false;

    const sessions = client.session.getAll() || [];

    return sessions.some((session) => session.topic === account.signingExtras?.sessionTopic);
  },
);

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
    accounts: walletProviderModel.$accounts,
    session: walletConnectModel.$session,
  },

  filter: ({ accounts, session }) => accounts.length > 0 && Boolean(session?.topic),
  fn: ({ accounts, session }) => ({ accounts, topic: session?.topic! }),
  target: walletConnectModel.events.sessionTopicUpdated,
});

sample({
  clock: walletConnectModel.events.connectionRejected,
  fn: () => ReconnectStep.REJECTED,
  target: $reconnectStep,
});

sample({
  clock: [walletConnectModel.events.connected, reconnectAborted],
  fn: () => ReconnectStep.NOT_STARTED,
  target: $reconnectStep,
});

sample({
  clock: walletProviderModel.events.forgetButtonClicked,
  source: {
    wallet: walletSelectModel.$walletForDetails,
    accounts: walletModel.$accounts,
  },
  filter: ({ wallet }) => wallet !== null,
  fn: ({ wallet, accounts }) => {
    const account = accounts.find((a) => a.walletId === wallet!.id);

    return account?.signingExtras?.sessionTopic;
  },
  target: walletConnectModel.events.disconnectStarted,
});

export const walletConnectDetailsModel = {
  $connected,
  $reconnectStep,
  events: {
    reset,
    reconnectStarted,
    reconnectAborted,
    sessionTopicUpdated,
  },
};
