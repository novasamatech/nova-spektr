import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { combineEvents } from 'patronum';
import Client from '@walletconnect/sign-client';
import { EngineTypes } from '@walletconnect/types';

import { walletConnectModel, type InitReconnectParams } from '@entities/walletConnect';
import { toAccountId } from '@shared/lib/utils';
import { chainsService } from '@shared/api/network';
import { WalletConnectAccount, type HexString } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { operationSignModel } from './operation-sign-model';
import { ReconnectStep } from '../lib/types';
import { operationSignUtils } from '../lib/operation-sign-utils';

type SignParams = {
  client: Client;
  payload: EngineTypes.RequestParams;
};

const reset = createEvent();
const reconnectModalShown = createEvent();
const reconnectStarted = createEvent<InitReconnectParams>();
const reconnectAborted = createEvent();
const reconnectDone = createEvent();
const signingStarted = createEvent<SignParams>();

const $reconnectStep = createStore(ReconnectStep.NOT_STARTED).reset(reset);
const $isSigningRejected = createStore(false).reset(reset);
const $signature = createStore('').reset(reset);

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
      isSigningRejected
    );
  },
);

type SignResponse = {
  payload: string;
  signature: HexString;
};
const signFx = createEffect(({ client, payload }: SignParams): Promise<SignResponse> => {
  return client.request(payload);
});

sample({
  clock: signingStarted,
  target: signFx,
});

sample({
  clock: signFx.doneData,
  fn: ({ signature }) => signature,
  target: $signature,
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
  clock: walletConnectModel.events.connected,
  source: {
    signer: operationSignModel.$signer,
    accounts: walletModel.$accounts,
    step: $reconnectStep,
    session: walletConnectModel.$session,
  },
  filter: ({ step, session }) => {
    return (
      (operationSignUtils.isReconnectingStep(step) || operationSignUtils.isConnectedStep(step)) &&
      operationSignUtils.isTopicExist(session)
    );
  },
  fn: ({ accounts, signer, session }) => ({
    accounts: accounts.filter((a) => a.walletId === signer?.walletId),
    topic: session?.topic!,
  }),
  target: walletConnectModel.events.sessionTopicUpdated,
});

sample({
  clock: combineEvents({
    events: [reconnectStarted, walletConnectModel.events.sessionTopicUpdateDone, walletConnectModel.events.connected],
  }),
  source: {
    newAccounts: walletConnectModel.$accounts,
    signer: operationSignModel.$signer,
    accounts: walletModel.$accounts,
  },
  filter: ({ signer }) => Boolean(signer?.walletId),
  fn: ({ signer, accounts, newAccounts }) => {
    const { id, ...oldAccountParams } = accounts.find((a) => a.walletId === signer?.walletId!)!;

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
      walletId: signer?.walletId!,
      accounts,
      newAccounts: updatedAccounts,
    };
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
  $signature,
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
