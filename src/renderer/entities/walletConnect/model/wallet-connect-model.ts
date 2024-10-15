import Client from '@walletconnect/sign-client';
import { type PairingTypes, type SessionTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import keyBy from 'lodash/keyBy';

import { localStorageService } from '@/shared/api/local-storage';
import { storageService } from '@/shared/api/storage';
import { type Account, type ID, type Wallet, type WcAccount, kernelModel } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { walletModel, walletUtils } from '@/entities/wallet';
import {
  DEFAULT_APP_METADATA,
  DEFAULT_LOGGER,
  DEFAULT_POLKADOT_EVENTS,
  DEFAULT_POLKADOT_METHODS,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
  EXTEND_PAIRING,
  WALLETCONNECT_CLIENT_ID,
} from '../lib/constants';
import { type InitConnectParams } from '../lib/types';
import { walletConnectUtils } from '../lib/utils';

type SessionTopicParams = {
  accounts: Account[];
  topic: string;
};

type UpdateAccountsParams = {
  walletId: ID;
  accounts: WcAccount[];
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

  for (const s of sessions) {
    client.extend({ topic: s.topic }).catch((e) => console.warn(e));
  }

  const pairings = client.pairing.getAll({ active: true });

  for (const p of pairings) {
    client.core.pairing.updateExpiry({
      topic: p.topic,
      expiry: Math.round(Date.now() / 1000) + EXTEND_PAIRING,
    });
  }
});

const subscribeToEventsFx = createEffect((client: Client) => {
  const boundSessionUpdated = scopeBind(sessionUpdated);
  const boundReset = scopeBind(reset);

  client.on('session_update', ({ topic, params }) => {
    console.log('WC EVENT', 'session_update', { topic, params });
    const { namespaces } = params;
    const _session = client.session.get(topic);
    const updatedSession = { ..._session, namespaces };

    boundSessionUpdated(updatedSession);
  });

  client.on('session_ping', (args) => {
    console.log('WC EVENT', 'session_ping', args);
  });

  client.on('session_event', (args) => {
    console.log('WC EVENT', 'session_event', args);
  });

  client.on('session_delete', () => {
    console.log('WC EVENT', 'session_delete');
    boundReset();
  });
});

const checkPersistedStateFx = createEffect((client: Client) => {
  if (client.session.length) {
    const lastKeyIndex = client.session.keys.length - 1;
    const session = client.session.get(client.session.keys[lastKeyIndex]);
    sessionUpdated(session);
  }
});

const logClientIdFx = createEffect(async (client: Client) => {
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

      return { ...rest, signingExtras: newSigningExtras };
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

const removePairingFx = createEffect(async ({ client, topic }: { client: Client; topic: string }): Promise<void> => {
  const reason = getSdkError('USER_DISCONNECTED');

  await client.pairing.delete(topic, reason);
});

type UpdateParams = {
  wallet: Wallet;
  accounts: WcAccount[];
};
const updateWcAccountsFx = createEffect(
  async ({ wallet, accounts }: UpdateParams): Promise<WcAccount[] | undefined> => {
    const oldAccountIds = wallet.accounts.map((account) => account.id);

    await storageService.accounts.deleteAll(oldAccountIds);
    const newAccounts = await storageService.accounts.createAll(accounts);

    return newAccounts as WcAccount[];
  },
);

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
      console.error(`Failed to init connection`, e);
    }
  },
);

type ConnectParams = {
  client: Client;
  approval: () => Promise<unknown>;
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

sample({
  clock: accountsUpdated,
  source: walletModel.$wallets,
  fn: (wallets, { accounts, walletId }) => {
    const wallet = wallets.find((wallet) => wallet.id === walletId)!;

    return { wallet, accounts };
  },
  target: updateWcAccountsFx,
});

sample({
  clock: updateWcAccountsFx.done,
  source: walletModel.$wallets,
  filter: (_, { result: accounts }) => Boolean(accounts?.length),
  fn: (wallets, { params }) => {
    return wallets.map<Wallet>((wallet) => {
      if (wallet.id !== params.wallet.id) return wallet;

      return { ...wallet, accounts: params.accounts };
    });
  },
  target: walletModel.$wallets,
});

sample({
  clock: kernelModel.events.appStarted,
  target: createClientFx,
});

sample({
  clock: createClientFx.doneData,
  filter: (client): client is Client => client !== null,
  target: [extendSessionsFx, subscribeToEventsFx, checkPersistedStateFx, logClientIdFx],
});

sample({
  clock: disconnectFx.done,
  target: createClientFx,
});

sample({
  clock: sessionUpdated,
  target: $session,
});

sample({
  clock: createClientFx.doneData,
  filter: (client) => nonNullable(client),
  fn: (client) => client!,
  target: $client,
});

sample({
  clock: createClientFx.failData,
  fn: (e) => console.error('Failed to create WalletConnect client', e),
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
    approval: initData!.approval,
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

sample({
  clock: connectFx.done,
  target: connected,
});

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

sample({
  clock: disconnectFx.done,
  target: reset,
});

sample({
  clock: currentSessionTopicUpdated,
  source: walletModel.$activeWallet,
  filter: (wallet: Wallet | undefined): wallet is Wallet => Boolean(wallet),
  fn: (wallet, topic) => ({
    accounts: wallet.accounts,
    topic,
  }),
  target: sessionTopicUpdatedFx,
});

sample({
  clock: sessionTopicUpdated,
  target: sessionTopicUpdatedFx,
});

sample({
  clock: sessionTopicUpdatedFx.doneData,
  source: walletModel.$wallets,
  filter: (_, accounts) => Boolean(accounts?.length),
  fn: (wallets, accounts) => {
    const walletId = accounts![0].walletId;
    const updatedMap = keyBy(accounts, 'id');

    return wallets.map((wallet) => {
      if (wallet.id !== walletId) return wallet;
      const accounts = wallet.accounts.map((account) => updatedMap[account.id] || account);

      return { ...wallet, accounts } as Wallet;
    });
  },
  target: walletModel.$wallets,
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
  source: $client,
  filter: (client: Client | null): client is Client => client !== null,
  fn: (client, topic) => ({ client, topic }),
  target: removePairingFx,
});

sample({
  clock: $client,
  source: walletModel.$wallets,
  filter: (_, client) => Boolean(client),
  fn: (wallets, client) => {
    return wallets.map((wallet) => {
      if (walletUtils.isWalletConnectGroup(wallet)) {
        wallet.isConnected = walletConnectUtils.isConnectedByAccounts(client!, wallet);
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
    accountsUpdateDone: updateWcAccountsFx.doneData,
    pairingRemoved,
    reset,
  },
};
