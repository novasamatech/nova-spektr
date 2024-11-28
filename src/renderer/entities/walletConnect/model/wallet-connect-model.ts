import { type SessionTypes } from '@walletconnect/types';
// eslint-disable-next-line import-x/no-named-as-default
import Provider from '@walletconnect/universal-provider';
import { getSdkError } from '@walletconnect/utils';
import { createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import isEmpty from 'lodash/isEmpty';
import keyBy from 'lodash/keyBy';

import { localStorageService } from '@/shared/api/local-storage';
import { storageService } from '@/shared/api/storage';
import { type Account, type ID, type Wallet, kernelModel } from '@/shared/core';
import { series } from '@/shared/effector';
import { nonNullable, nullable } from '@/shared/lib/utils';
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
  walletId: ID;
  accounts: Account[];
  topic: string;
};

type UpdateAccountsParams = {
  walletId: ID;
  accounts: Account[];
};

const connect = createEvent<Omit<InitConnectParams, 'provider'>>();
const disconnectCurrentSessionStarted = createEvent();
const disconnectStarted = createEvent<string>();
const reset = createEvent();
const sessionUpdated = createEvent<SessionTypes.Struct>();
const uriUpdated = createEvent<string>();
const connected = createEvent();
const connectionRejected = createEvent<string>();
const sessionTopicUpdated = createEvent<SessionTopicParams>();
const accountsUpdated = createEvent<UpdateAccountsParams>();
const pairingRemoved = createEvent<string>();

const $provider = createStore<Provider | null>(null).reset(reset);
const $session = createStore<SessionTypes.Struct | null>(null).reset(reset);
const $uri = restore(uriUpdated, '').reset(disconnectCurrentSessionStarted);
const $accounts = createStore<string[]>([]).reset(reset);

const createProviderFx = createEffect(async (): Promise<Provider | undefined> => {
  return Provider.init({
    logger: DEFAULT_LOGGER,
    relayUrl: DEFAULT_RELAY_URL,
    projectId: DEFAULT_PROJECT_ID,
    metadata: DEFAULT_APP_METADATA,
  });
});

const initConnectFx = createEffect(
  async ({ provider, chains, pairing }: InitConnectParams): Promise<SessionTypes.Struct | undefined> => {
    const optionalNamespaces = {
      polkadot: {
        chains,
        methods: [DEFAULT_POLKADOT_METHODS.POLKADOT_SIGN_TRANSACTION],
        events: [DEFAULT_POLKADOT_EVENTS.CHAIN_CHANGED, DEFAULT_POLKADOT_EVENTS.ACCOUNTS_CHANGED],
      },
    };

    return provider.connect({ pairingTopic: pairing?.topic, optionalNamespaces });
  },
);

const extendSessionsFx = createEffect((client: Provider) => {
  const sessions = client.client.session.getAll();

  for (const s of sessions) {
    client.client.extend({ topic: s.topic }).catch((e) => console.warn(e));
  }

  const pairings = client.client.pairing.getAll({ active: true });

  for (const p of pairings) {
    client.client.core.pairing.updateExpiry({
      topic: p.topic,
      expiry: Math.round(Date.now() / 1000) + EXTEND_PAIRING,
    });
  }
});

const subscribeUriFx = createEffect((provider: Provider) => {
  const boundUriUpdated = scopeBind(uriUpdated, { safe: true });

  provider.on('display_uri', (uri: string) => {
    boundUriUpdated(uri);
  });
});

const subscribeToEventsFx = createEffect(({ client }: Provider) => {
  const boundSessionUpdated = scopeBind(sessionUpdated, { safe: true });
  const boundReset = scopeBind(reset, { safe: true });

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

const checkPersistedStateFx = createEffect((client: Provider) => {
  if (client.client.session.length) {
    const lastKeyIndex = client.client.session.keys.length - 1;
    const session = client.client.session.get(client.client.session.keys[lastKeyIndex]);
    sessionUpdated(session);
  }
});

const logProviderIdFx = createEffect(async (client: Provider) => {
  try {
    const clientId = await client.client.core.crypto.getClientId();
    console.log('WalletConnect ProviderID: ', clientId);
    localStorageService.saveToStorage(WALLETCONNECT_CLIENT_ID, clientId);
  } catch (error) {
    console.error('Failed to set WalletConnect clientId in localStorage: ', error);
  }
});

const sessionTopicUpdatedFx = createEffect(
  async ({ accounts, topic, provider, walletId }: SessionTopicParams & { provider: Provider }) => {
    const oldSessionTopic = accounts[0]?.signingExtras?.sessionTopic;
    let oldSession: SessionTypes.Struct | undefined;

    try {
      oldSession = provider.client.session.get(oldSessionTopic);
    } catch (e) {
      console.error(e);
    }

    const updatedAccounts = accounts.map(({ signingExtras, ...rest }) => {
      const newSigningExtras = { ...signingExtras, sessionTopic: topic };

      return { ...rest, signingExtras: newSigningExtras };
    });

    const updated = await storageService.accounts.updateAll(updatedAccounts);

    if (oldSession) {
      await disconnectFx({ provider, session: oldSession });
    }

    if (!updated) {
      return {
        walletId,
        accounts: [],
      };
    }

    return {
      walletId,
      accounts: updatedAccounts,
    };
  },
);

const removePairingFx = createEffect(
  async ({ provider, topic }: { provider: Provider; topic: string }): Promise<void> => {
    const reason = getSdkError('USER_DISCONNECTED');

    await provider.client.pairing.delete(topic, reason);
  },
);

type UpdateParams = {
  wallet: Wallet;
  accounts: Account[];
};
const updateWcAccountsFx = createEffect(async ({ wallet, accounts }: UpdateParams): Promise<Account[] | undefined> => {
  const oldAccountIds = wallet.accounts.map((account) => account.id);
  const newAccountsWithoutId = accounts.map((account) => {
    const { id: _, ...newAccount } = account;

    return newAccount;
  });

  const [_, newAccounts] = await Promise.all([
    storageService.accounts.deleteAll(oldAccountIds),
    storageService.accounts.createAll(newAccountsWithoutId),
  ]);

  return newAccounts;
});

type DisconnectParams = {
  provider: Provider;
  session: SessionTypes.Struct;
};

const disconnectFx = createEffect(async ({ provider, session }: DisconnectParams) => {
  const reason = getSdkError('USER_DISCONNECTED');

  await provider.client.disconnect({
    topic: session.topic,
    reason,
  });
});

const removeSessionFx = createEffect(
  async ({ provider, session }: { provider: Provider; session: SessionTypes.Struct }) => {
    const reason = getSdkError('USER_DISCONNECTED');

    await provider.client.session.delete(session.topic, reason);
  },
);

sample({
  clock: connect,
  source: $provider,
  filter: nonNullable,
  target: subscribeUriFx,
});

sample({
  clock: accountsUpdated,
  source: walletModel.$wallets,
  filter: (_, { accounts }) => !isEmpty(accounts),
  fn: (wallets, { accounts, walletId }) => {
    const wallet = wallets.find((wallet) => wallet.id === walletId)!;

    return { wallet, accounts };
  },
  target: updateWcAccountsFx,
});

sample({
  clock: updateWcAccountsFx.done,
  filter: ({ result: accounts }) => nonNullable(accounts) && accounts.length > 0,
  fn: ({ params, result: accounts }) => ({ walletId: params.wallet.id, accounts: accounts! }),
  target: walletModel.events.updateAccounts,
});

sample({
  clock: kernelModel.events.appStarted,
  target: createProviderFx,
});

sample({
  clock: createProviderFx.doneData,
  filter: (client): client is Provider => client !== null,
  target: [extendSessionsFx, subscribeToEventsFx, checkPersistedStateFx, logProviderIdFx],
});

// sample({
//   clock: disconnectFx.done,
//   target: createProviderFx,
// });

sample({
  clock: sessionUpdated,
  target: $session,
});

sample({
  clock: createProviderFx.doneData,
  filter: (client) => nonNullable(client),
  fn: (client) => client!,
  target: $provider,
});

sample({
  clock: createProviderFx.failData,
  fn: (e) => console.error('Failed to create WalletConnect client', e),
  target: createProviderFx,
});

sample({
  clock: connect,
  source: $provider,
  filter: (provider, props) => provider !== null && !isEmpty(props.chains),
  fn: (provider, props) => ({
    provider: provider!,
    ...props,
  }),
  target: initConnectFx,
});

sample({
  clock: initConnectFx.doneData,
  filter: nonNullable,
  fn: (session) =>
    Object.values(session!.namespaces)
      .map((namespace) => namespace.accounts)
      .flat(),
  target: $accounts,
});

sample({
  clock: initConnectFx.doneData,
  filter: nonNullable,
  target: $session,
});

sample({
  clock: initConnectFx.done,
  target: connected,
});

sample({
  clock: disconnectCurrentSessionStarted,
  source: $session,
  filter: (session) => nonNullable(session),
  fn: (session) => session!.topic,
  target: disconnectStarted,
});

sample({
  clock: disconnectStarted,
  source: $provider,
  filter: (provider, sessionTopic) => nonNullable(provider?.client.session.get(sessionTopic)),
  fn: (provider, sessionTopic) => ({
    provider: provider!,
    session: provider!.client.session.get(sessionTopic)!,
  }),
  target: disconnectFx,
});

sample({
  clock: disconnectFx.done,
  fn: ({ params }) => params,
  target: removeSessionFx,
});

sample({
  clock: sessionTopicUpdated,
  source: $provider,
  filter: nonNullable,
  fn: (provider, params) => ({ provider: provider!, ...params }),
  target: sessionTopicUpdatedFx,
});

sample({
  clock: sessionTopicUpdatedFx.doneData,
  source: walletModel.$allWallets,
  filter: (_, { accounts }) => accounts.length > 0,
  fn: (wallets, { accounts, walletId }) => {
    const wallet = wallets.find((w) => w.id === walletId);
    if (nullable(wallet)) {
      return { walletId, accounts };
    }

    const updatedMap = keyBy(accounts, 'id');
    const updatedAccounts = wallet.accounts.map((account) => updatedMap[account.id] || account);

    return { walletId, accounts: updatedAccounts };
  },
  target: walletModel.events.updateAccounts,
});

sample({
  clock: initConnectFx.fail,
  fn: ({ error }) => {
    console.error('Failed to connect:', error);

    return error.message;
  },
  target: connectionRejected,
});

sample({
  clock: pairingRemoved,
  source: $provider,
  filter: (provider: Provider | null): provider is Provider => provider !== null,
  fn: (provider, topic) => ({ provider, topic }),
  target: removePairingFx,
});

sample({
  clock: [$provider, walletModel.events.walletCreatedDone, updateWcAccountsFx.doneData],
  source: {
    wallets: walletModel.$allWallets,
    provider: $provider,
  },
  filter: ({ provider }) => Boolean(provider),
  fn: ({ wallets, provider }) => {
    return wallets.filter(walletUtils.isWalletConnectGroup).map((wallet) => {
      return {
        walletId: wallet.id,
        data: { isConnected: walletConnectUtils.isConnectedByAccounts(provider!, wallet) },
      };
    });
  },
  target: series(walletModel.events.updateWallet),
});

export const walletConnectModel = {
  $provider,
  $session,
  $uri,
  $accounts,

  events: {
    connect,
    initConnectFailed: initConnectFx.fail,
    disconnectCurrentSessionStarted,
    disconnectStarted,
    sessionUpdated,
    connected,
    connectionRejected,
    sessionTopicUpdated,
    sessionTopicUpdateFailed: sessionTopicUpdatedFx.fail,
    sessionTopicUpdateDone: sessionTopicUpdatedFx.doneData,
    accountsUpdated,
    accountsUpdateDone: updateWcAccountsFx.doneData,
    pairingRemoved,
    reset,
  },
};
