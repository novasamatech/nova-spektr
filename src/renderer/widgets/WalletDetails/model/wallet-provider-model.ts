import { combine, createEvent, createStore, sample } from 'effector';

import { accountUtils, walletModel } from '@renderer/entities/wallet';
import { walletSelectModel } from '@renderer/features/wallets';
import { Account, Wallet } from '@renderer/shared/core';
import { walletConnectModel } from '@renderer/entities/walletConnect';
import { ReconnectStep } from '../common/const';

const reset = createEvent();
const reconnectStarted = createEvent();
const reconnectAborted = createEvent();
const sessionTopicUpdated = createEvent();
const forgetButtonClicked = createEvent();

const $reconnectStep = createStore<ReconnectStep>(ReconnectStep.NOT_STARTED).reset(reset);

const $accounts = combine(
  {
    details: walletSelectModel.$walletForDetails,
    accounts: walletModel.$accounts,
  },
  ({ details, accounts }): Account[] => {
    if (!details) return [];

    return accounts.filter((account) => account.walletId === details.id);
  },
);

const $connected = combine($accounts, walletConnectModel.$client, (accounts, client): boolean => {
  const account = accounts[0];
  if (!client || !account || !accountUtils.isWalletConnectAccount(account)) return false;

  const sessions = client?.session.getAll() || [];

  const storedSession = sessions.find((s) => s.topic === accounts[0].signingExtras?.sessionTopic);

  return Boolean(storedSession);
});

sample({
  clock: forgetButtonClicked,
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

sample({
  clock: forgetButtonClicked,
  source: walletSelectModel.$walletForDetails,
  filter: (wallet): wallet is Wallet => wallet !== null,
  target: [walletSelectModel.events.walletForDetailsCleared, walletModel.events.walletRemoved],
});

sample({
  clock: reconnectStarted,
  fn: () => ReconnectStep.RECONNECTING,
  target: $reconnectStep,
});

sample({
  clock: walletConnectModel.events.connected,
  fn: () => ReconnectStep.NOT_STARTED,
  target: $reconnectStep,
});

sample({
  clock: walletConnectModel.events.connected,
  source: {
    accounts: $accounts,
    session: walletConnectModel.$session,
  },
  fn: ({ accounts, session }) => ({
    accounts,
    topic: session?.topic || '',
  }),
  target: walletConnectModel.events.sessionTopicUpdated,
});

sample({
  clock: walletConnectModel.events.connectionRejected,
  fn: () => ReconnectStep.REJECTED,
  target: $reconnectStep,
});

sample({
  clock: reconnectAborted,
  fn: () => ReconnectStep.NOT_STARTED,
  target: $reconnectStep,
});

export const walletProviderModel = {
  $accounts,
  $connected,
  $reconnectStep,
  events: {
    reset,
    reconnectStarted,
    reconnectAborted,
    sessionTopicUpdated,
    forgetButtonClicked,
  },
};
