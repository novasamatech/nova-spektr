import Client from '@walletconnect/sign-client';
import { PairingTypes, SessionTypes } from '@walletconnect/types';
import { createEffect, createEvent, createStore, forward, sample, scopeBind } from 'effector';
import { getSdkError } from '@walletconnect/utils';
import keyBy from 'lodash/keyBy';

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
  WALLETCONNECT_CLIENT_ID,
} from '../lib';
import { Account, kernelModel } from '@renderer/shared/core';
import { localStorageService } from '@renderer/shared/api/local-storage';
import { walletModel } from '@renderer/entities/wallet/model/wallet-model';
import { storageService } from '@renderer/shared/api/storage';

type InitConnectResult = {
  uri: string | undefined;
  approval: () => Promise<SessionTypes.Struct>;
};

type ConnectResult = {
  pairings: PairingTypes.Struct[];
  session: SessionTypes.Struct;
};

type SessionTopicUpdateProps = {
  accounts: Account[];
  topic: string;
};

const connect = createEvent<Omit<InitConnectProps, 'client'>>();
const disconnect = createEvent();
const reset = createEvent();
const sessionUpdated = createEvent<SessionTypes.Struct>();
const connected = createEvent();
const connectionRejected = createEvent<string>();
const currentSessionTopicUpdated = createEvent<string>();
const sessionTopicUpdated = createEvent<SessionTopicUpdateProps>();

const $client = createStore<Client | null>(null).reset(reset);
const $session = createStore<SessionTypes.Struct | null>(null).reset(reset);
const $uri = createStore<string>('').reset(reset);
const $accounts = createStore<string[]>([]).reset(reset);
const $pairings = createStore<PairingTypes.Struct[]>([]).reset(reset);

const extendSessionsFx = createEffect((client: Client) => {
  const sessions = client.session.getAll();

  sessions.forEach((s) => {
    client.extend({ topic: s.topic }).catch((e) => console.warn(e));
  });
});

const subscribeToEventsFx = createEffect((client: Client) => {
  const bindedSessionUpdated = scopeBind(sessionUpdated);
  const bindedReset = scopeBind(reset);

  client.on('session_update', ({ topic, params }) => {
    console.log('WC EVENT', 'session_update', { topic, params });
    const { namespaces } = params;
    const _session = client.session.get(topic);
    const updatedSession = { ..._session, namespaces };

    bindedSessionUpdated(updatedSession);
  });

  client.on('session_ping', (args) => {
    console.log('WC EVENT', 'session_ping', args);
  });

  client.on('session_event', (args) => {
    console.log('WC EVENT', 'session_event', args);
  });

  client.on('session_delete', () => {
    console.log('WC EVENT', 'session_delete');
    bindedReset();
  });
});

const checkPersistedStateFx = createEffect(async (client: Client) => {
  if (!client) return;

  const pairings = client.pairing.getAll({ active: true });

  // Set pairings
  console.log('RESTORED PAIRINGS: ', pairings);

  if (client.session.length) {
    const lastKeyIndex = client.session.keys.length - 1;
    const session = client.session.get(client.session.keys[lastKeyIndex]);
    console.log('RESTORED SESSION:', session);

    sessionUpdated(session);
  }
});

const logClientIdFx = createEffect(async (client: Client) => {
  if (!client) return;

  try {
    const clientId = await client.core.crypto.getClientId();
    console.log('WalletConnect ClientID: ', clientId);
    localStorageService.saveToStorage(WALLETCONNECT_CLIENT_ID, clientId);
  } catch (error) {
    console.error('Failed to set WalletConnect clientId in localStorage: ', error);
  }
});

const sessionTopicUpdatedFx = createEffect(
  async ({ accounts, topic }: SessionTopicUpdateProps): Promise<Account[] | undefined> => {
    const updatedAccounts = accounts.map(({ signingExtras, ...rest }) => {
      const newSigningExtras = { ...signingExtras, sessionTopic: topic };

      return { ...rest, signingExtras: newSigningExtras } as Account;
    });
    const updated = await storageService.accounts.updateAll(updatedAccounts);

    return updated && updatedAccounts;
  },
);

const createClientFx = createEffect(async (): Promise<Client | undefined> => {
  try {
    return Client.init({
      logger: DEFAULT_LOGGER,
      relayUrl: DEFAULT_RELAY_URL,
      projectId: DEFAULT_PROJECT_ID,
      metadata: DEFAULT_APP_METADATA,
    });
  } catch (e) {
    console.log(`Failed to create new Client`, e);
  }
});

forward({
  from: kernelModel.events.appStarted,
  to: createClientFx,
});

sample({
  clock: createClientFx.doneData,
  filter: (client): client is Client => client !== null,
  target: [extendSessionsFx, subscribeToEventsFx, checkPersistedStateFx, logClientIdFx],
});

const initConnectFx = createEffect(
  async ({ client, chains, pairing }: InitConnectProps): Promise<InitConnectResult | undefined> => {
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
      console.log(`Failed to init connection`, e);
    }
  },
);

const connectFx = createEffect(async ({ client, approval }: ConnectProps): Promise<ConnectResult | undefined> => {
  const session = await approval();
  console.log('Established session:', session);

  return {
    pairings: client.pairing.getAll({ active: true }),
    session: session as SessionTypes.Struct,
  };
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
  clock: createClientFx.doneData,
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
  fn: ($client, initData) => ({
    client: $client!,
    approval: initData?.approval!,
  }),
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

sample({
  clock: currentSessionTopicUpdated,
  source: walletModel.$activeAccounts,
  fn: (accounts, topic) => ({
    accounts,
    topic,
  }),
  target: sessionTopicUpdated,
});

forward({
  from: sessionTopicUpdated,
  to: sessionTopicUpdatedFx,
});

sample({
  clock: sessionTopicUpdatedFx.doneData,
  source: walletModel.$accounts,
  fn: (accounts, updatedAccounts) => {
    const updatedMap = keyBy(updatedAccounts, 'id');

    return accounts.map((account) => updatedMap[account.id] || account);
  },
  target: walletModel.$accounts,
});

sample({
  clock: connectFx.fail,
  fn: ({ error }) => {
    console.error('Failed to connect:', error);

    return error.message;
  },
  target: connectionRejected,
});

export const walletConnectModel = {
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
    connectionRejected,
    currentSessionTopicUpdated,
    sessionTopicUpdated,
    reset,
  },
};
