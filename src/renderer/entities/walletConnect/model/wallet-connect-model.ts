import Client from '@walletconnect/sign-client';
import { PairingTypes, SessionTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { createEffect, createEvent, createStore, forward, sample, scopeBind } from 'effector';
import keyBy from 'lodash/keyBy';

import { nonNullable } from '@shared/lib/utils';
import { ID, Account, WalletConnectAccount, kernelModel } from '@shared/core';
import { localStorageService } from '@shared/api/local-storage';
import { storageService } from '@shared/api/storage';
import { walletModel, walletUtils } from '../../wallet';
import { InitConnectParams } from '../lib/types';
import { walletConnectUtils } from '../lib/utils';
import {
  WALLETCONNECT_CLIENT_ID,
  DEFAULT_LOGGER,
  DEFAULT_RELAY_URL,
  DEFAULT_PROJECT_ID,
  DEFAULT_APP_METADATA,
  DEFAULT_POLKADOT_METHODS,
  DEFAULT_POLKADOT_EVENTS,
  EXTEND_PAIRING,
} from '../lib/constants';

type SessionTopicParams = {
  accounts: Account[];
  topic: string;
};

type UpdateAccountsParams = {
  walletId: ID;
  newAccounts: WalletConnectAccount[];
};

const connect = createEvent<Omit<InitConnectParams, 'client'>>();
const disconnectCurrentSessionStarted = createEvent();
const disconnectStarted = createEvent<string>();
const reset = createEvent();
const sessionUpdated = createEvent<SessionTypes.Struct>();
const connected = createEvent();
const connectionRejected = createEvent<string>();
const currentSessionTopicUpdated = createEvent<string>();
const sessionTopicUpdated = createEvent<SessionTopicParams>();
const accountsUpdated = createEvent<UpdateAccountsParams>();
const pairingRemoved = createEvent<string>();

const $client = createStore<Client | null>(null).reset(reset);
const $session = createStore<SessionTypes.Struct | null>(null).reset(reset);
const $uri = createStore<string>('').reset(disconnectCurrentSessionStarted);
const $accounts = createStore<string[]>([]).reset(reset);
const $pairings = createStore<PairingTypes.Struct[]>([]).reset(reset);

const extendSessionsFx = createEffect((client: Client) => {
  const sessions = client.session.getAll();

  sessions.forEach((s) => {
    client.extend({ topic: s.topic }).catch((e) => console.warn(e));
  });

  const pairings = client.pairing.getAll({ active: true });

  pairings.forEach((p) => {
    client.core.pairing.updateExpiry({
      topic: p.topic,
      expiry: Math.round(Date.now() / 1000) + EXTEND_PAIRING,
    });
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
  async ({ accounts, topic }: SessionTopicParams): Promise<Account[] | undefined> => {
    const updatedAccounts = accounts.map(({ signingExtras, ...rest }) => {
      const newSigningExtras = { ...signingExtras, sessionTopic: topic };

      return { ...rest, signingExtras: newSigningExtras } as Account;
    });
    const updated = await storageService.accounts.updateAll(updatedAccounts);

    return updated && updatedAccounts;
  },
);

const createClientFx = createEffect(async (): Promise<Client | undefined> => {
  return Client.init({
    logger: DEFAULT_LOGGER,
    relayUrl: DEFAULT_RELAY_URL,
    projectId: DEFAULT_PROJECT_ID,
    metadata: DEFAULT_APP_METADATA,
  });
});

const updateWalletConnectAccountsFx = createEffect(
  async ({
    walletId,
    newAccounts,
    accounts,
  }: {
    walletId: ID;
    accounts: Account[];
    newAccounts: WalletConnectAccount[];
  }): Promise<WalletConnectAccount[] | undefined> => {
    const oldAccountIds = accounts.filter((account) => account.walletId === walletId).map(({ id }) => id);

    await storageService.accounts.deleteAll(oldAccountIds);

    const dbAccounts = await storageService.accounts.createAll(newAccounts);

    if (!dbAccounts) return undefined;

    return dbAccounts as WalletConnectAccount[];
  },
);

const removePairingFx = createEffect(async ({ client, topic }: { client: Client; topic: string }): Promise<void> => {
  const reason = getSdkError('USER_DISCONNECTED');

  await client.pairing.delete(topic, reason);
});

sample({
  clock: accountsUpdated,
  source: {
    accounts: walletModel.$accounts,
  },
  fn: ({ accounts }, { newAccounts, walletId }) => ({
    accounts,
    newAccounts,
    walletId,
  }),
  target: updateWalletConnectAccountsFx,
});

sample({
  clock: updateWalletConnectAccountsFx.doneData,
  source: {
    accounts: walletModel.$accounts,
  },
  filter: (_, newAccounts) => Boolean(newAccounts?.length),
  fn: ({ accounts }, newAccounts) => {
    return accounts.filter((a) => a.walletId !== newAccounts![0].walletId).concat((newAccounts as Account[]) || []);
  },
  target: walletModel.$accounts,
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

type InitConnectResult = {
  uri: string | undefined;
  approval: () => Promise<SessionTypes.Struct>;
};
const initConnectFx = createEffect(
  async ({ client, chains, pairing }: InitConnectParams): Promise<InitConnectResult | undefined> => {
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

      return { uri, approval };
    } catch (e) {
      console.log(`Failed to init connection`, e);
    }
  },
);

type ConnectParams = {
  client: Client;
  approval: () => Promise<any>;
  onConnect?: () => void;
};
type ConnectResult = {
  pairings: PairingTypes.Struct[];
  session: SessionTypes.Struct;
};
const connectFx = createEffect(async ({ client, approval }: ConnectParams): Promise<ConnectResult | undefined> => {
  const session = await approval();

  console.log('Established session:', session);

  return {
    pairings: client.pairing.getAll({ active: true }),
    session: session as SessionTypes.Struct,
  };
});

type DisconnectParams = {
  client: Client;
  session: SessionTypes.Struct;
};

const disconnectFx = createEffect(async ({ client, session }: DisconnectParams) => {
  const reason = getSdkError('USER_DISCONNECTED');

  await client.disconnect({
    topic: session.topic,
    reason,
  });
});

forward({
  from: disconnectFx.done,
  to: createClientFx,
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
  clock: createClientFx.failData,
  fn: (e) => console.log('Failed to create WalletConnect client', e),
  target: createClientFx,
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
  filter: (client, initData) => Boolean(client) && Boolean(initData?.approval),
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

forward({ from: connectFx.done, to: connected });

sample({
  clock: disconnectCurrentSessionStarted,
  source: $session,
  filter: (session: SessionTypes.Struct | null): session is SessionTypes.Struct => session !== null,
  fn: (session) => session.topic,
  target: disconnectStarted,
});

sample({
  clock: disconnectStarted,
  source: $client,
  filter: (client, sessionTopic) => Boolean(client?.session.get(sessionTopic)),
  fn: (client, sessionTopic) => ({
    client: client!,
    session: client!.session.get(sessionTopic)!,
  }),
  target: disconnectFx,
});

forward({ from: disconnectFx.done, to: reset });

sample({
  clock: currentSessionTopicUpdated,
  source: walletModel.$activeAccounts,
  fn: (accounts, topic) => ({ accounts, topic }),
  target: sessionTopicUpdatedFx,
});

forward({ from: sessionTopicUpdated, to: sessionTopicUpdatedFx });

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

sample({
  clock: pairingRemoved,
  source: { client: $client },
  filter: ({ client }) => client !== null,
  fn: ({ client }, topic) => ({
    client: client!,
    topic,
  }),
  target: removePairingFx,
});

sample({
  clock: $client,
  source: {
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
  },
  filter: (_, client) => Boolean(client),
  fn: ({ wallets, accounts }, client) => {
    return wallets.map((wallet) => {
      if (walletUtils.isWalletConnectGroup(wallet)) {
        wallet.isConnected = walletConnectUtils.isConnectedByAccounts(client!, wallet, accounts);
      }

      return wallet;
    }, []);
  },
  target: walletModel.$wallets,
});

export const walletConnectModel = {
  $client,
  $session,
  $uri,
  $accounts,
  $pairings,
  events: {
    connect,
    disconnectCurrentSessionStarted,
    disconnectStarted,
    sessionUpdated,
    connected,
    connectionRejected,
    currentSessionTopicUpdated,
    sessionTopicUpdated,
    sessionTopicUpdateDone: sessionTopicUpdatedFx.doneData,
    accountsUpdated,
    accountsUpdateDone: updateWalletConnectAccountsFx.doneData,
    pairingRemoved,
    reset,
  },
};
