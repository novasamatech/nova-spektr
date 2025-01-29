import { attach, combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type WcAccount } from '@/shared/core';
import { type AnyAccount, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletConnect, walletConnectService } from '@/features/wallet-wallet-connect';
import { ReconnectStep } from '../lib/constants';

const flow = createGate<{ accounts: AnyAccount[] }>({ defaultState: { accounts: [] } });
const $accounts = flow.state.map(({ accounts }) => accounts);
const start = createEvent();
const abort = createEvent();

const $connected = combine($accounts, walletConnect.$sessions, (accounts, sessions) => {
  return walletConnectService.areAccountsConnected(
    sessions,
    accounts.filter(walletConnectService.isWalletConnectAccount),
  );
});

const updateSessionFx = attach({
  source: { accounts: $accounts, chains: networkModel.$chains },
  mapParams(_, { accounts, chains }) {
    const account = accounts
      .filter(walletConnectService.isWalletConnectAccount)
      .find(a => a.signingExtras.pairingTopic);
    const pairingTopic = account?.signingExtras?.pairingTopic;

    return {
      pairingTopic,
      chains: Object.values(chains).map(c => c.chainId),
    };
  },
  effect: walletConnect.restoreSession,
});

const $reconnectStep = createStore<ReconnectStep>(ReconnectStep.NOT_STARTED).reset(flow.close);

sample({
  clock: start,
  fn: () => ReconnectStep.RECONNECTING,
  target: [$reconnectStep, updateSessionFx],
});

sample({
  clock: updateSessionFx.done,
  source: {
    accounts: $accounts,
    chains: networkModel.$chains,
  },
  fn: ({ accounts, chains }, { result: session }) => {
    const wcAccounts = accounts.filter(walletConnectService.isWalletConnectAccount);
    const accountsToUpdate = walletConnectService.getAccountsFromSession(session, Object.values(chains));
    const updates: WcAccount[] = [];

    for (const { accountId, chain } of accountsToUpdate) {
      const account = wcAccounts.find(a => a.accountId === accountId && a.chainId === chain.chainId);

      if (account) {
        updates.push(walletConnectService.updateAccount(account, session));
      }
    }

    return updates;
  },
  target: accounts.updateAccounts,
});

sample({
  clock: updateSessionFx.done,
  source: $reconnectStep,
  fn: () => ReconnectStep.NOT_STARTED,
  target: $reconnectStep,
});

sample({
  clock: updateSessionFx.fail,
  source: $reconnectStep,
  filter: step => step === ReconnectStep.RECONNECTING,
  fn: () => ReconnectStep.REJECTED,
  target: $reconnectStep,
});

sample({
  clock: abort,
  fn: () => ReconnectStep.NOT_STARTED,
  target: $reconnectStep,
});

export const walletConnectReconnect = {
  $accounts,
  $connected,
  $reconnectStep,
  $reconnectUri: walletConnect.$pairingUri,
  start,
  abort,
  flow,
};
