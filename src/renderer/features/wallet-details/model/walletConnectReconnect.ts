import { attach, combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { t } from 'i18next';
import { spread } from 'patronum';

import { type WcAccount } from '@/shared/core';
import { assert } from '@/shared/lib/utils';
import { type AnyAccount, type AnyAccountDraft, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletConnect, walletConnectService } from '@/features/wallet-connect-wallet';
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
  effect: walletConnect.refreshSession,
});

const $reconnectStep = createStore<ReconnectStep>(ReconnectStep.NOT_STARTED).reset(flow.close);
const $error = createStore<{ title: string; description?: string } | null>(null).reset(flow.close);

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
    const accountsFromSession = walletConnectService.getAccountsFromSession(session, Object.values(chains));
    const accountsToCreate = new Set<AnyAccountDraft<WcAccount>>();
    const accountsToUpdate = new Set<WcAccount>();
    const accountsToDelete = new Set(wcAccounts);

    const name = wcAccounts.map(a => a.name).at(0) ?? 'unknown';
    const walletId = wcAccounts.map(a => a.walletId).at(0);

    assert(walletId, "Can't get walletId from accounts");

    for (const { accountId, chain } of accountsFromSession) {
      const account = wcAccounts.find(a => a.accountId === accountId && a.chainId === chain.chainId);

      if (account) {
        accountsToUpdate.add(walletConnectService.updateAccount(account, session));
      } else {
        accountsToCreate.add(
          walletConnectService.createAccount({
            walletId,
            name,
            accountId,
            chainId: chain.chainId,
            session,
          }),
        );
      }

      for (const accountToDelete of accountsToDelete) {
        if (accountToDelete.chainId === chain.chainId) {
          accountsToDelete.delete(accountToDelete);
          break;
        }
      }
    }

    return {
      create: Array.from(accountsToCreate),
      update: Array.from(accountsToUpdate),
      delete: Array.from(accountsToDelete),
    };
  },
  target: spread({
    create: accounts.createAccounts,
    update: accounts.updateAccounts,
    delete: accounts.deleteAccounts,
  }),
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
  clock: updateSessionFx.fail,
  fn: ({ error }) =>
    walletConnectService.buildErrorDisplay(error, {
      title: t('walletDetails.walletConnect.rejectTitle'),
      description: t('walletDetails.walletConnect.rejectDescription'),
    }),
  target: $error,
});

sample({
  clock: abort,
  fn: () => ReconnectStep.NOT_STARTED,
  target: $reconnectStep,
});

sample({
  clock: abort,
  target: $error.reinit,
});

export const walletConnectReconnect = {
  $accounts,
  $connected,
  $reconnectStep,
  $error,
  $reconnectUri: walletConnect.$pairingUri,
  start,
  abort,
  flow,
};
