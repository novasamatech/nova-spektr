import { type EngineTypes } from '@walletconnect/types';
import type Provider from '@walletconnect/universal-provider';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { combineEvents } from 'patronum';

import { AccountType, type HexString, type WcAccount } from '@/shared/core';
import { nonNullable, toAccountId } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type InitReconnectParams, walletConnectModel } from '@/entities/walletConnect';
import { operationSignUtils } from '../lib/operation-sign-utils';
import { ReconnectStep } from '../lib/types';

import { operationSignModel } from './operation-sign-model';

type SignParams = {
  provider: Provider;
  payload: EngineTypes.RequestParams;
};

const reset = createEvent();
const reconnectModalShown = createEvent();
const reconnectStarted = createEvent<InitReconnectParams>();
const reconnectAborted = createEvent();
const reconnectDone = createEvent();
const signingStarted = createEvent<SignParams[]>();

const $reconnectStep = createStore(ReconnectStep.NOT_STARTED).reset(reset);
const $isSigningRejected = createStore(false).reset(reset);
const $signatures = createStore<HexString[]>([]).reset(reset);

type SignResponse = {
  signature: HexString;
};

const $isStatusShown = combine(
  {
    reconnectStep: $reconnectStep,
    isSigningRejected: $isSigningRejected,
  },
  ({ reconnectStep, isSigningRejected }): boolean => {
    return (
      operationSignUtils.isReconnectingStep(reconnectStep) ||
      operationSignUtils.isConnectedStep(reconnectStep) ||
      operationSignUtils.isRejectedStep(reconnectStep) ||
      operationSignUtils.isFailedStep(reconnectStep) ||
      isSigningRejected
    );
  },
);

const signFx = createEffect(async (signParams: SignParams[]): Promise<SignResponse[]> => {
  const results: SignResponse[] = [];

  for (const { provider, payload } of signParams) {
    // should be signed step by step
    const response = await provider.client.request<SignResponse>(payload);

    results.push(response);
  }

  return results;
});

sample({
  clock: signingStarted,
  target: signFx,
});

sample({
  clock: signFx.doneData,
  fn: (responses) => responses.map(({ signature }) => signature),
  target: $signatures,
});

sample({
  clock: signFx.fail,
  fn: () => true,
  target: $isSigningRejected,
});

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

sample({
  clock: reconnectStarted,
  target: walletConnectModel.events.connect,
});

sample({
  clock: [walletConnectModel.events.initConnectFailed, walletConnectModel.events.sessionTopicUpdateFailed],
  source: $reconnectStep,
  filter: (step) => step === ReconnectStep.RECONNECTING,
  fn: () => ReconnectStep.FAILED,
  target: $reconnectStep,
});

sample({
  clock: walletConnectModel.events.connected,
  source: {
    signer: operationSignModel.$signer,
    wallets: walletModel.$wallets,
    step: $reconnectStep,
    session: walletConnectModel.$session,
  },
  filter: ({ step, session, signer }) => {
    const isCorrectStep =
      operationSignUtils.isReconnectingStep(step) ||
      operationSignUtils.isFailedStep(step) ||
      operationSignUtils.isConnectedStep(step);

    return isCorrectStep && operationSignUtils.isTopicExist(session) && nonNullable(signer);
  },
  fn: ({ wallets, signer, session }) => ({
    walletId: signer!.walletId,
    accounts: walletUtils.getAccountsBy(wallets, (a) => a.walletId === signer?.walletId),
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
    signer: operationSignModel.$signer,
    wallets: walletModel.$wallets,
    newAccounts: walletConnectModel.$accounts,
    chains: networkModel.$chains,
  },
  filter: ({ signer }) => Boolean(signer?.walletId),
  fn: ({ signer, wallets, newAccounts, chains }) => {
    const oldAccount = walletUtils.getAccountBy(wallets, (a) => a.walletId === signer?.walletId);
    const updatedAccounts: WcAccount[] = [];

    for (const account of newAccounts) {
      const [_, chainId, address] = account.split(':');
      const accountId = toAccountId(address);
      const chain = Object.values(chains).find((chain) => chain.chainId.includes(chainId));

      if (!chain || !oldAccount) continue;

      updatedAccounts.push({
        ...oldAccount,
        chainId: chain.chainId,
        type: AccountType.WALLET_CONNECT,
        accountId,
      });
    }

    return { walletId: signer!.walletId, accounts: updatedAccounts };
  },
  target: walletConnectModel.events.accountsUpdated,
});

sample({
  clock: walletConnectModel.events.connectionRejected,
  source: $reconnectStep,
  filter: operationSignUtils.isReconnectingStep,
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
  target: reset,
});

export const signWcModel = {
  $reconnectStep,
  $isSigningRejected,
  $signatures,
  $isStatusShown,

  events: {
    signingStarted,
    reset,
    reconnectModalShown,
    reconnectStarted,
    reconnectAborted,
    reconnectDone,
  },
};
