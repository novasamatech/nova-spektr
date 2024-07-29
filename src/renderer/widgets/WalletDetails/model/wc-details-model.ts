import { createEvent, createStore, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import { chainsService } from '@shared/api/network';
import { type Wallet, type WcAccount } from '@shared/core';
import { toAccountId } from '@shared/lib/utils';
import { balanceModel } from '@entities/balance';
import { walletModel, walletUtils } from '@entities/wallet';
import { type InitConnectParams, walletConnectModel } from '@entities/walletConnect';
import { walletSelectModel } from '@features/wallets';
import { ForgetStep, ReconnectStep } from '../lib/constants';

const reset = createEvent();
const confirmReconnectShown = createEvent();
const reconnectStarted = createEvent<Omit<InitConnectParams, 'client'> & { currentSession: string }>();
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
    const accounts = walletUtils.getAccountsBy(wallets, (account) => account.walletId === wallet.id);

    return accounts.map((account) => account.id);
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
    wallet: walletSelectModel.$walletForDetails,
    session: walletConnectModel.$session,
  },
  filter: ({ step, wallet, session }) =>
    step === ReconnectStep.RECONNECTING && Boolean(wallet) && Boolean(session?.topic),
  fn: ({ wallet, session }) => ({
    accounts: wallet!.accounts,
    topic: session!.topic,
  }),
  target: walletConnectModel.events.sessionTopicUpdated,
});

sample({
  clock: combineEvents({
    events: [reconnectStarted, walletConnectModel.events.sessionTopicUpdateDone, walletConnectModel.events.connected],
  }),
  source: {
    wallet: walletSelectModel.$walletForDetails,
    newAccounts: walletConnectModel.$accounts,
  },
  filter: ({ wallet }) => Boolean(wallet),
  fn: ({ wallet, newAccounts }) => {
    const updatedAccounts = newAccounts.map((account) => {
      const [_, chainId, address] = account.split(':');
      const chain = chainsService.searchChain(chainId);

      return {
        ...wallet!.accounts[0],
        chainId: chain?.chainId,
        accountId: toAccountId(address),
      } as WcAccount;
    });

    return { walletId: wallet!.id, accounts: updatedAccounts };
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
  clock: [walletConnectModel.events.accountsUpdateDone, reconnectAborted],
  fn: () => ReconnectStep.NOT_STARTED,
  target: $reconnectStep,
});

sample({
  clock: forgetButtonClicked,
  source: {
    wallet: walletSelectModel.$walletForDetails,
    wallets: walletModel.$wallets,
  },
  filter: ({ wallet }) => Boolean(wallet),
  fn: ({ wallet, wallets }) => ({
    sessionTopic: wallet!.accounts[0].signingExtras?.sessionTopic,
    pairingTopic: wallet!.accounts[0].signingExtras?.pairingTopic,
  }),
  target: spread({
    targets: {
      sessionTopic: walletConnectModel.events.disconnectStarted,
      pairingTopic: walletConnectModel.events.pairingRemoved,
    },
  }),
});

sample({
  clock: forgetButtonClicked,
  fn: () => ForgetStep.FORGETTING,
  target: $forgetStep,
});

sample({
  clock: forgetButtonClicked,
  source: walletSelectModel.$walletForDetails,
  filter: (wallet): wallet is Wallet => wallet !== null,
  fn: (wallet) => wallet!.id,
  target: walletModel.events.walletRemoved,
});

sample({
  clock: walletModel.events.walletRemovedSuccess,
  source: { forgetStep: $forgetStep },
  filter: ({ forgetStep }) => forgetStep !== ForgetStep.NOT_STARTED,
  fn: () => ForgetStep.SUCCESS,
  target: $forgetStep,
});

sample({
  clock: forgetModalClosed,
  target: walletSelectModel.events.walletIdCleared,
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
};
