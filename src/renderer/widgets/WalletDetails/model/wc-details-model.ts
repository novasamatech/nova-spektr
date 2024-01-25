import { createEvent, createStore, sample } from 'effector';
import { combineEvents, spread } from 'patronum';

import { accountUtils, walletModel } from '@entities/wallet';
import { walletConnectModel, InitConnectParams } from '@entities/walletConnect';
import { ReconnectStep, ForgetStep } from '../lib/constants';
import { walletProviderModel } from './wallet-provider-model';
import { walletSelectModel } from '@features/wallets';
import type { Wallet, WalletConnectAccount } from '@shared/core';
import { chainsService } from '@shared/api/network';
import { toAccountId } from '@shared/lib/utils';
import { balanceModel } from '@entities/balance';

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
  source: walletModel.$accounts,
  fn: (accounts, wallet) => accountUtils.getWalletAccounts(wallet.id, accounts).map((a) => a.accountId),
  target: balanceModel.events.accountsBalancesRemoved,
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
