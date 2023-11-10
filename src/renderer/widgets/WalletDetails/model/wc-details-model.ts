import { combine, createEvent, createStore, forward, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import { accountUtils, walletModel } from '@renderer/entities/wallet';
import { walletConnectUtils, walletConnectModel, InitConnectParams } from '@renderer/entities/walletConnect';
import { ReconnectStep, ForgetStep } from '../lib/constants';
import { walletProviderModel } from './wallet-provider-model';
import { walletSelectModel } from '@renderer/features/wallets';
import type { Wallet, WalletConnectAccount } from '@renderer/shared/core';
import { chainsService } from '@renderer/entities/network';
import { toAccountId } from '@renderer/shared/lib/utils';

const reset = createEvent();
const reconnectStarted = createEvent<Omit<InitConnectParams, 'client'> & { currentSession: string }>();
const reconnectAborted = createEvent();
const sessionTopicUpdated = createEvent();
const forgetButtonClicked = createEvent();
const forgetModalClosed = createEvent();

const $reconnectStep = createStore<ReconnectStep>(ReconnectStep.NOT_STARTED).reset(reset);
const $forgetStep = createStore<ForgetStep>(ForgetStep.NOT_STARTED).reset(reset);

const $isConnected = combine(
  {
    accounts: walletProviderModel.$accounts,
    client: walletConnectModel.$client,
  },
  ({ accounts, client }): boolean => {
    const account = accounts[0];
    if (!client || !account || !accountUtils.isWalletConnectAccount(account) || !account.signingExtras?.sessionTopic) {
      return false;
    }

    return walletConnectUtils.isConnected(account.signingExtras.sessionTopic, client);
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
    step: $reconnectStep,
    accounts: walletProviderModel.$accounts,
    session: walletConnectModel.$session,
  },
  filter: ({ step, accounts, session }) =>
    step === ReconnectStep.RECONNECTING && accounts.length > 0 && Boolean(session?.topic),
  fn: ({ accounts, session }) => ({ accounts, topic: session?.topic! }),
  target: walletConnectModel.events.sessionTopicUpdated,
});

sample({
  clock: combineEvents({
    events: [reconnectStarted, walletConnectModel.events.sessionTopicUpdateDone, walletConnectModel.events.connected],
  }),
  source: {
    newAccounts: walletConnectModel.$accounts,
    accounts: walletProviderModel.$accounts,
    wallet: walletSelectModel.$walletForDetails,
  },
  filter: ({ wallet }) => Boolean(wallet),
  fn: ({ accounts, wallet, newAccounts }) => {
    const oldAccount = accounts.find((a) => a.walletId === wallet!.id);
    const { id, ...oldAccountParams } = oldAccount!;

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
      walletId: wallet!.id,
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
  clock: [walletConnectModel.events.accountsUpdateDone, reconnectAborted],
  fn: () => ReconnectStep.NOT_STARTED,
  target: $reconnectStep,
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

    return {
      sessionTopic: account?.signingExtras?.sessionTopic,
      pairingTopic: account?.signingExtras?.pairingTopic,
    };
  },
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
  fn: () => ForgetStep.SUCCESS,
  target: $forgetStep,
});

forward({
  from: forgetModalClosed,
  to: walletSelectModel.events.walletForDetailsCleared,
});

export const wcDetailsModel = {
  $isConnected,
  $reconnectStep,
  $forgetStep,
  events: {
    reset,
    reconnectStarted,
    reconnectAborted,
    sessionTopicUpdated,
    forgetButtonClicked,
    forgetModalClosed,
  },
};
