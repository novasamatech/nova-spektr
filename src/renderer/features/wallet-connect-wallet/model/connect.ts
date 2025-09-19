import { type default as Client } from '@walletconnect/sign-client';
import { type EngineTypes, type SessionTypes } from '@walletconnect/types';
import { SDK_ERRORS, getSdkError } from '@walletconnect/utils';
import { attach, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { produce } from 'immer';
import { isObject } from 'lodash';
import { readonly } from 'patronum';

import { type ChainId } from '@/shared/core';
import { assert, nonNullable, nullable } from '@/shared/lib/utils';
import { accountSync } from '@/domains/network';
import { walletConnectService } from '../lib/service';

import { signClient } from './signClient';

const $sessions = createStore<Record<string, SessionTypes.Struct>>({});

/**
 * QR code content for pairing
 */
const updateUri = createEvent<string>();
const $pairingUri = restore(updateUri, '');

const populateSessionsFx = createEffect(async (client: Client) => {
  return client.session.getAll();
});

const subscribeSessionsFx = createEffect((client: Client) => {
  client.on('proposal_expire', () => {
    updateUri('');
  });

  client.on('session_delete', () => {
    populateSessionsFx(client);
  });

  client.on('session_expire', () => {
    updateUri('');
    populateSessionsFx(client);
  });
});

sample({
  clock: signClient.$client,
  filter: nonNullable,
  target: [populateSessionsFx, subscribeSessionsFx],
});

sample({
  clock: populateSessionsFx.doneData,
  fn(sessions) {
    return Object.fromEntries(sessions.map(s => [s.pairingTopic, s]));
  },
  target: $sessions,
});

const createSessionFx = createEffect(
  async ({ pairingTopic, chains, client }: { pairingTopic?: string; chains: ChainId[]; client: Client }) => {
    const optionalNamespaces = walletConnectService.createNamespaces(chains);
    const connect = await client.connect({ pairingTopic, optionalNamespaces });

    if (connect.uri) {
      updateUri(connect.uri);
    }

    return connect.approval().finally(() => updateUri(''));
  },
);

sample({
  clock: createSessionFx.done,
  target: accountSync.syncAccounts,
});

const removeSessionFx = attach({
  source: { client: signClient.$client },
  async effect({ client }, { pairingTopic }: { pairingTopic: string }) {
    assert(client, 'WalletConnect Client not found');

    const sessions = client.session.getAll();
    const session = sessions.find(s => s.pairingTopic === pairingTopic);

    if (!session) return;

    const reason = getSdkError('USER_DISCONNECTED');

    return client.disconnect({
      topic: session.topic,
      reason,
    });
  },
});

/**
 * Try to get actual session or create a new one.
 */
const restoreSessionFx = attach({
  source: { client: signClient.$client, sessions: $sessions },
  async effect({ client, sessions }, { pairingTopic, chains }: { pairingTopic?: string; chains: ChainId[] }) {
    if (nullable(client)) throw new Error('WalletConnect Client not found');

    // existing session
    if (pairingTopic && sessions[pairingTopic]) {
      return sessions[pairingTopic];
    }

    try {
      // trying to restore not expiring session
      return await createSessionFx({ client, chains, pairingTopic });
    } catch (e) {
      // direct reject should be handled immediately
      if (isObject(e) && 'code' in e && e.code === SDK_ERRORS.USER_REJECTED.code) {
        throw e;
      }

      // creating new session (with qr code scanning)
      return await createSessionFx({ client, chains });
    }
  },
});

/**
 * Kill previous session and create a new one.
 */
const refreshSessionFx = attach({
  source: { client: signClient.$client },
  async effect({ client }, { pairingTopic, chains }: { pairingTopic?: string; chains: ChainId[] }) {
    assert(client, 'WalletConnect Client not found');

    // killing existing session
    if (pairingTopic) {
      await removeSessionFx({ pairingTopic });
    }

    try {
      // trying to restore not expiring session
      return await createSessionFx({ client, chains, pairingTopic });
    } catch (e) {
      // direct reject should be handled immediately
      if (isObject(e) && 'code' in e && e.code === SDK_ERRORS.USER_REJECTED.code) {
        throw e;
      }

      // creating new session (with qr code scanning)
      return await createSessionFx({ client, chains });
    }
  },
});

sample({
  clock: createSessionFx.doneData,
  source: signClient.$client,
  filter: nonNullable,
  target: populateSessionsFx,
});

const removePairingFx = attach({
  source: signClient.$client,
  effect(client, { pairingTopic }: { pairingTopic: string }) {
    if (nullable(client)) throw new Error('WalletConnect Client not found');

    const reason = getSdkError('USER_DISCONNECTED');

    return client.pairing.delete(pairingTopic, reason);
  },
});

type RequestParams = {
  client: Client;
  session: SessionTypes.Struct;
  chainId: EngineTypes.RequestParams['chainId'];
  request: EngineTypes.RequestParams['request'];
};

const requestFx = createEffect(async ({ client, session, request, chainId }: RequestParams): Promise<unknown> => {
  return client.request({
    topic: session.topic,
    chainId,
    request,
  });
});

sample({
  clock: removeSessionFx.done,
  source: $sessions,
  fn: (sessions, { params: { pairingTopic } }) => {
    return produce(sessions, draft => {
      delete draft[pairingTopic];
    });
  },
  target: $sessions,
});

export const walletConnect = {
  $client: readonly(signClient.$client),
  $sessions: readonly($sessions),
  $pairingUri: readonly($pairingUri),

  request: requestFx,

  createSession: createSessionFx,
  restoreSession: restoreSessionFx,
  refreshSession: refreshSessionFx,
  removeSession: removeSessionFx,
  removePairing: removePairingFx,
};
