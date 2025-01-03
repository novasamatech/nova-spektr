import { createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { combineEvents, spread } from 'patronum';

import { type ChainId, type Wallet, type WcAccount } from '@/shared/core';
import { nonNullable, toAccountId } from '@/shared/lib/utils';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { type InitConnectParams, walletConnectModel, walletConnectUtils } from '@/entities/walletConnect';
import { ForgetStep, ReconnectStep } from '../lib/constants';

const walletConnectDetailsFlow = createGate<{ wallet: Wallet | null }>({ defaultState: { wallet: null } });

const $wallet = walletConnectDetailsFlow.state.map(({ wallet }) => wallet);

const reset = createEvent();
const confirmReconnectShown = createEvent();
const reconnectStarted = createEvent<Omit<InitConnectParams, 'provider'> & { currentSession: string }>();
const reconnectAborted = createEvent();
const sessionTopicUpdated = createEvent();
const forgetButtonClicked = createEvent<Wallet>();
const forgetModalClosed = createEvent();

const $reconnectStep = createStore<ReconnectStep>(ReconnectStep.NOT_STARTED).reset(reset);
const $forgetStep = createStore<ForgetStep>(ForgetStep.NOT_STARTED).reset(reset);

sample({
  clock: forgetButtonClicked,
  source: walletModel.$wallets,
  fn: (wallets, wallet) => {
    const accounts = walletUtils.getAccountsBy(wallets, account => account.walletId === wallet.id);

    return accounts.map(account => account.accountId);
  },
  target: balanceModel.events.balancesRemoved,
});

sample({
  clock: confirmReconnectShown,
  fn: () => ReconnectStep.CONFIRMATION,
  target: $reconnectStep,
});

sample({
  clock: reconnectStarted,
  fn: () => ReconnectStep.RECONNECTING,
  target: $reconnectStep,
});

sample({
  clock: reconnectStarted,
  target: walletConnectModel.events.connect,
});

sample({
  clock: walletConnectModel.events.connected,
  source: {
    step: $reconnectStep,
    wallet: $wallet,
    session: walletConnectModel.$session,
  },
  filter: ({ step, wallet, session }) => {
    const correctStep = step === ReconnectStep.RECONNECTING || step === ReconnectStep.REFRESH_ACCOUNTS;

    return correctStep && nonNullable(wallet) && nonNullable(session?.topic);
  },
  fn: ({ wallet, session }) => ({
    walletId: wallet!.id,
    accounts: wallet!.accounts,
    topic: session!.topic,
  }),
  target: walletConnectModel.events.sessionTopicUpdated,
});

sample({
  clock: combineEvents({
    events: [walletConnectModel.events.sessionTopicUpdateDone],
    reset: reconnectStarted,
  }),
  source: {
    wallet: $wallet,
    newAccounts: walletConnectModel.$accounts,
    chains: networkModel.$chains,
  },
  filter: ({ wallet }) => nonNullable(wallet),
  fn: ({ wallet, newAccounts, chains }) => {
    const updatedAccounts: WcAccount[] = [];
    const chainIds = Object.keys(chains);

    for (const newAccount of newAccounts) {
      const [_, chainId, address] = newAccount.split(':');

      const fullChainId = chainIds.find(chain => chain.includes(chainId));
      const chain = fullChainId && chains[fullChainId as ChainId];
      if (!chain) continue;

      const account = wallet!.accounts.at(0);
      if (!account || !accountUtils.isWcAccount(account)) continue;

      updatedAccounts.push({
        ...account,
        chainId: chain.chainId,
        accountId: toAccountId(address),
        signingExtras: account.signingExtras || {},
      });
    }

    return { walletId: wallet!.id, accounts: updatedAccounts };
  },
  target: walletConnectModel.events.accountsUpdated,
});

sample({
  clock: walletConnectModel.events.connectionRejected,
  source: $reconnectStep,
  filter: step => step === ReconnectStep.RECONNECTING,
  fn: () => ReconnectStep.REJECTED,
  target: $reconnectStep,
});

sample({
  clock: [walletConnectModel.events.initConnectFailed, walletConnectModel.events.sessionTopicUpdateFailed],
  source: $reconnectStep,
  fn: () => ReconnectStep.REFRESH_ACCOUNTS,
  target: $reconnectStep,
});

sample({
  clock: [walletConnectModel.events.initConnectFailed, walletConnectModel.events.sessionTopicUpdateFailed],
  source: networkModel.$chains,
  fn: chains => ({ chains: walletConnectUtils.getWalletConnectChains(Object.values(chains)) }),
  target: walletConnectModel.events.connect,
});

sample({
  clock: [walletConnectModel.events.accountsUpdateDone, reconnectAborted],
  fn: () => ReconnectStep.NOT_STARTED,
  target: $reconnectStep,
});

sample({
  clock: forgetButtonClicked,
  source: $wallet,
  filter: nonNullable,
  fn: wallet => {
    const account = wallet!.accounts.at(0);
    if (!account || !accountUtils.isWcAccount(account)) {
      throw new Error('Not Wallet Connect account.');
    }

    return {
      sessionTopic: account.signingExtras.sessionTopic ?? '',
      pairingTopic: account.signingExtras.pairingTopic ?? '',
    };
  },
  target: spread({
    sessionTopic: walletConnectModel.events.disconnectStarted,
    pairingTopic: walletConnectModel.events.pairingRemoved,
  }),
});

sample({
  clock: forgetButtonClicked,
  fn: () => ForgetStep.FORGETTING,
  target: $forgetStep,
});

sample({
  clock: forgetButtonClicked,
  source: $wallet,
  filter: nonNullable,
  fn: wallet => wallet!.id,
  target: walletModel.events.walletRemoved,
});

sample({
  clock: walletModel.events.walletRemovedSuccess,
  source: { forgetStep: $forgetStep },
  filter: ({ forgetStep }) => forgetStep !== ForgetStep.NOT_STARTED,
  fn: () => ForgetStep.SUCCESS,
  target: $forgetStep,
});

export const wcDetailsModel = {
  $reconnectStep,
  $forgetStep,
  events: {
    reset,
    confirmReconnectShown,
    reconnectStarted,
    reconnectAborted,
    sessionTopicUpdated,
    forgetButtonClicked,
    forgetModalClosed,
  },
  walletConnectDetailsFlow,
};
