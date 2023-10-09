import Client from '@walletconnect/sign-client';
import { PairingTypes, SessionTypes } from '@walletconnect/types';
import { createEffect, createEvent, createStore, forward, sample } from 'effector';
import { getSdkError } from '@walletconnect/utils';

import { nonNullable } from '@renderer/shared/lib/utils';
import {
  ConnectProps,
  DEFAULT_APP_METADATA,
  DEFAULT_LOGGER,
  DEFAULT_POLKADOT_EVENTS,
  DEFAULT_POLKADOT_METHODS,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
  DisconnectProps,
  InitConnectProps,
} from '../lib';
import { kernelModel } from '@renderer/shared/core';

const connect = createEvent<Omit<InitConnectProps, 'client'>>();
const disconnect = createEvent();
const reset = createEvent();
const sessionUpdated = createEvent<SessionTypes.Struct>();
const connected = createEvent();
const rejectConnection = createEvent<any>();

const $client = createStore<Client | null>(null).reset(reset);
const $session = createStore<SessionTypes.Struct | null>(null).reset(reset);
const $uri = createStore<string>('').reset(reset);
const $accounts = createStore<string[]>([]).reset(reset);
const $pairings = createStore<PairingTypes.Struct[]>([]).reset(reset);

const _subscribeToEvents = createEffect(async (client: Client) => {
  if (!client) return;

  client.on('session_ping', (args) => {
    console.log('WC EVENT', 'session_ping', args);
  });

  client.on('session_event', (args) => {
    console.log('WC EVENT', 'session_event', args);
  });

  client.on('session_update', ({ topic, params }) => {
    console.log('WC EVENT', 'session_update', { topic, params });
    const { namespaces } = params;
    const _session = client.session.get(topic);
    const updatedSession = { ..._session, namespaces };

    sessionUpdated(updatedSession);
  });

  client.on('session_delete', () => {
    console.log('WC EVENT', 'session_delete');
    reset();
  });
});

const _checkPersistedState = createEffect(async (client: Client) => {
  if (!client) return;

  const pairings = client.pairing.getAll({ active: true });

  // Set pairings
  console.log('RESTORED PAIRINGS: ', pairings);

  if (client.session.length) {
    const lastKeyIndex = client.session.keys.length - 1;
    const _session = client.session.get(client.session.keys[lastKeyIndex]);
    console.log('RESTORED SESSION:', _session);

    sessionUpdated(_session);
  }
});

const _logClientId = createEffect(async (client: Client) => {
  if (!client) return;

  try {
    const clientId = await client.core.crypto.getClientId();
    console.log('WalletConnect ClientID: ', clientId);
    localStorage.setItem('WALLETCONNECT_CLIENT_ID', clientId);
  } catch (error) {
    console.error('Failed to set WalletConnect clientId in localStorage: ', error);
  }
});

const createClient = createEffect(async () => {
  try {
    const _client = await Client.init({
      logger: DEFAULT_LOGGER,
      relayUrl: DEFAULT_RELAY_URL,
      projectId: DEFAULT_PROJECT_ID,
      metadata: DEFAULT_APP_METADATA,
    });

    return _client;
  } catch (err) {
    console.log(err);
  }
});

forward({
  from: kernelModel.events.appStarted,
  to: createClient,
});

sample({
  clock: createClient.doneData,
  filter: (client) => client !== null,
  fn: (client) => client!,
  target: [_subscribeToEvents, _checkPersistedState, _logClientId],
});

const initConnectFx = createEffect(async ({ client, chains, pairing }: InitConnectProps) => {
  try {
    const optionalNamespaces = {
      polkadot: {
        methods: [DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_TRANSACTION],
        chains,
        events: [DEFAULT_POLKADOT_EVENTS.CHAIN_CHANGED, DEFAULT_POLKADOT_EVENTS.ACCOUNTS_CHANGED],
      },
    };

    const { uri, approval } = await client.connect({
      pairingTopic: pairing?.topic,
      optionalNamespaces,
    });

    return {
      uri,
      approval,
    };
  } catch (e) {
    console.error(e);
  }
});

const connectFx = createEffect(async ({ client, approval }: ConnectProps) => {
  try {
    const session = await approval();
    console.log('Established session:', session);

    return {
      pairings: client.pairing.getAll({ active: true }),
      session: session as SessionTypes.Struct,
    };
  } catch (e: any) {
    rejectConnection(e);
  }
});

const disconnectFx = createEffect(async ({ client, session }: DisconnectProps) => {
  try {
    await client.disconnect({
      topic: session.topic,
      reason: getSdkError('USER_DISCONNECTED'),
    });
  } catch (error) {
    return;
  }
});

forward({
  from: sessionUpdated,
  to: $session,
});

sample({
  clock: createClient.doneData,
  filter: (client) => nonNullable(client),
  fn: (client) => client!,
  target: $client,
});

sample({
  clock: connect,
  source: $client,
  filter: (client, props) => client !== null && props.chains.length > 0,
  fn: (client, props) => ({
    client: client!,
    ...props,
  }),
  target: initConnectFx,
});

sample({
  clock: initConnectFx.doneData,
  source: $client,
  filter: (client, initData) => client !== null && initData?.approval !== null,
  fn: ($client, initData) => {
    return {
      client: $client!,
      approval: initData?.approval!,
    };
  },
  target: connectFx,
});

sample({
  clock: initConnectFx.doneData,
  fn: (data) => data?.uri || '',
  target: $uri,
});

sample({
  clock: connectFx.doneData,
  filter: (props) => nonNullable(props),
  fn: (props) => {
    return Object.values(props!.session.namespaces)
      .map((namespace) => namespace.accounts)
      .flat();
  },
  target: $accounts,
});

sample({
  clock: connectFx.doneData,
  filter: (props) => nonNullable(props),
  fn: (props) => props!.session,
  target: $session,
});

sample({
  clock: connectFx.doneData,
  filter: (props) => nonNullable(props),
  fn: (props) => props!.pairings,
  target: $pairings,
});

forward({
  from: connectFx.done,
  to: connected,
});

sample({
  clock: disconnect,
  source: {
    client: $client,
    session: $session,
  },
  filter: ({ client, session }) => client !== null && session !== null,
  fn: ({ client, session }) => ({
    client: client!,
    session: session!,
  }),
  target: disconnectFx,
});

forward({
  from: disconnectFx.done,
  to: reset,
});

export const wcModel = {
  $client,
  $session,
  $uri,
  $accounts,
  $pairings,
  events: {
    connect,
    disconnect,
    sessionUpdated,
    connected,
    rejectConnection,
    reset,
  },
};
