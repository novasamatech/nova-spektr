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

/**
 * Identity of one reconnect request. `start` mints a fresh object, so a request
 * the user superseded can be told apart from the one in progress. Requests run
 * for minutes: `refreshSession` retries the session internally, so a failure
 * can arrive long after the user asked for another reconnect.
 */
type ReconnectAttempt = object;

const startAttempt = sample({ clock: start, fn: (): ReconnectAttempt => ({}) });
const $liveAttempt = createStore<ReconnectAttempt | null>(null).reset(flow.close, abort);

/** The request was started by the reconnect the user is waiting for. */
const isLiveAttempt = (live: ReconnectAttempt | null, { params }: { params: { attempt: ReconnectAttempt } }) =>
  params.attempt === live;

const updateSessionFx = attach({
  source: { accounts: $accounts, chains: networkModel.$chains },
  mapParams(_params: { attempt: ReconnectAttempt }, { accounts, chains }) {
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
  clock: startAttempt,
  target: $liveAttempt,
});

sample({
  clock: startAttempt,
  fn: () => ReconnectStep.RECONNECTING,
  target: $reconnectStep,
});

sample({
  clock: startAttempt,
  fn: attempt => ({ attempt }),
  target: updateSessionFx,
});

// A superseded request can still succeed. Its accounts are dropped rather than written, because they
// name a session the live request has already replaced. That session is left to expire: both requests
// refresh the same pairing, so a disconnect by pairing topic could take out the live one.
sample({
  clock: updateSessionFx.done,
  source: {
    accounts: $accounts,
    chains: networkModel.$chains,
    attempt: $liveAttempt,
  },
  filter: ({ attempt }, done) => isLiveAttempt(attempt, done),
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
  source: $liveAttempt,
  filter: isLiveAttempt,
  fn: () => ReconnectStep.NOT_STARTED,
  target: $reconnectStep,
});

sample({
  clock: updateSessionFx.fail,
  source: { step: $reconnectStep, attempt: $liveAttempt },
  filter: ({ step, attempt }, fail) => step === ReconnectStep.RECONNECTING && isLiveAttempt(attempt, fail),
  fn: () => ReconnectStep.REJECTED,
  target: $reconnectStep,
});

sample({
  clock: updateSessionFx.fail,
  source: $liveAttempt,
  filter: isLiveAttempt,
  fn: (_attempt, { error }) =>
    walletConnectService.buildErrorDisplay(error, {
      rejected: {
        title: t('walletDetails.walletConnect.rejectTitle'),
        description: t('walletDetails.walletConnect.rejectDescription'),
      },
      unknown: {
        title: t('walletDetails.walletConnect.connectionFailedTitle'),
        description: t('walletDetails.walletConnect.connectionFailedDescription'),
      },
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
