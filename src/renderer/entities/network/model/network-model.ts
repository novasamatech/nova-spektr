import { type ApiPromise } from '@polkadot/api';
import { type VoidFn } from '@polkadot/api/types';
import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { combineEvents, spread } from 'patronum';

import {
  ProviderType,
  type ProviderWithMetadata,
  chainsService,
  metadataService,
  networkService,
} from '@/shared/api/network';
import { storageService } from '@/shared/api/storage';
import {
  type Chain,
  type ChainId,
  type ChainMetadata,
  type Connection,
  ConnectionStatus,
  ConnectionType,
  type ID,
  type NoID,
} from '@/shared/core';
import { createBuffer, series } from '@/shared/effector';
import { dictionary, nonNullable } from '@/shared/lib/utils';
import { networkUtils } from '../lib/network-utils';

const networkStarted = createEvent();
const chainConnected = createEvent<ChainId>();
const chainDisconnected = createEvent<ChainId>();
const connectionStatusChanged = createEvent<{ chainId: ChainId; status: ConnectionStatus }>();

const connected = createEvent<ChainId>();
const disconnected = createEvent<ChainId>();
const failed = createEvent<ChainId>();

const $chains = createStore<Record<ChainId, Chain>>({});

const $providers = createStore<Record<ChainId, ProviderWithMetadata>>({});
const $apis = createStore<Record<ChainId, ApiPromise>>({});

const $connections = createStore<Record<ChainId, Connection>>({});
const $connectionStatuses = createStore<Record<ChainId, ConnectionStatus>>({});

const $metadata = createStore<ChainMetadata[]>([]);
const $metadataSubscriptions = createStore<Record<ChainId, VoidFn>>({});

const populateChainsFx = createEffect((): Record<ChainId, Chain> => {
  return chainsService.getChainsMap({ sort: true });
});

const populateMetadataFx = createEffect((): Promise<ChainMetadata[]> => {
  return storageService.metadata.readAll();
});

const populateConnectionsFx = createEffect((): Promise<Connection[]> => {
  return storageService.connections.readAll();
});

const getDefaultStatusesFx = createEffect((chains: Record<ChainId, Chain>): Record<ChainId, ConnectionStatus> => {
  return dictionary(Object.values(chains), 'chainId', () => ConnectionStatus.DISCONNECTED);
});

type MetadataSubResult = {
  chainId: ChainId;
  unsubscribe: VoidFn;
};
const subscribeRuntimeVersionFx = createEffect(
  async ({ api, cachedVersion }: { api: ApiPromise; cachedVersion: number | null }): Promise<MetadataSubResult> => {
    const unsubscribe = await metadataService.subscribeRuntimeVersion({
      api,
      cachedRuntimeVersion: cachedVersion,
      callback: removeMetadata,
    });

    return { chainId: api.genesisHash.toHex(), unsubscribe };
  },
);

const unsubscribeMetadataFx = createEffect((unsubscribe: VoidFn) => {
  unsubscribe();
});

const saveMetadataFx = createEffect((metadata: NoID<ChainMetadata>[]): Promise<ChainMetadata[] | undefined> => {
  return storageService.metadata.createAll(metadata);
});

const removeMetadataFx = createEffect((ids: ID[]): Promise<ID[] | undefined> => {
  return storageService.metadata.deleteAll(ids);
});

type CreateProviderParams = {
  chainId: ChainId;
  nodes: string[];
  metadata?: ChainMetadata;
  providerType: ProviderType;
  DEBUG_NETWORKS?: boolean;
};
const createProviderFx = createEffect(
  async ({
    chainId,
    nodes,
    metadata,
    providerType,
    DEBUG_NETWORKS,
  }: CreateProviderParams): Promise<ProviderWithMetadata> => {
    const boundConnected = scopeBind(connected, { safe: true });
    const boundDisconnected = scopeBind(disconnected, { safe: true });
    const boundFailed = scopeBind(failed, { safe: true });

    const provider = networkService.createProvider(
      chainId,
      providerType,
      { nodes, metadata },
      {
        onConnected: () => {
          if (DEBUG_NETWORKS) {
            console.info('🟢 Provider connected ==> ', chainId);
          }
          boundConnected(chainId);
        },
        onDisconnected: () => {
          if (DEBUG_NETWORKS) {
            console.info('🟠 Provider disconnected ==> ', chainId);
          }
          boundDisconnected(chainId);
        },
        onError: () => {
          if (DEBUG_NETWORKS) {
            console.info('🔴 Provider error ==> ', chainId);
          }
          boundFailed(chainId);
        },
      },
    );

    provider.onMetadataReceived(({ metadata, metadataVersion, runtimeVersion }) => {
      metadataReceived({ chainId, metadata, metadataVersion, runtimeVersion });
    });

    if (providerType === ProviderType.LIGHT_CLIENT) {
      /**
       * HINT: Light Client provider must be connected manually GitHub Light
       * Client section -
       * https://github.com/polkadot-js/api/tree/master/packages/rpc-provider#readme
       */
      await provider.connect();
    }

    return provider;
  },
);

type CreateApiParams = {
  chainId: ChainId;
  provider: ProviderWithMetadata;
  existingApi: ApiPromise | null;
};
const createApiFx = createEffect(async ({ chainId, provider, existingApi }: CreateApiParams): Promise<ApiPromise> => {
  if (existingApi) {
    await existingApi.connect();

    return existingApi;
  }

  return networkService.createApi(chainId, provider);
});

type DisconnectParams = {
  api: ApiPromise;
  provider: ProviderWithMetadata;
};
const disconnectConnectionFx = createEffect(async ({ api, provider }: DisconnectParams): Promise<ChainId> => {
  const chainId = api.genesisHash.toHex();

  await api.disconnect();
  await provider.disconnect();

  return chainId;
});

sample({
  clock: networkStarted,
  target: [populateChainsFx, populateMetadataFx, populateConnectionsFx],
});

sample({
  clock: populateChainsFx.doneData,
  target: [$chains, getDefaultStatusesFx],
});

sample({
  clock: populateMetadataFx.doneData,
  target: $metadata,
});

sample({
  clock: getDefaultStatusesFx.doneData,
  target: $connectionStatuses,
});

sample({
  clock: populateConnectionsFx.doneData,
  source: $chains,
  fn: (chains, connections) => {
    const connectionsMap = dictionary(connections, 'chainId');
    const lightClientChains = networkUtils.getLightClientChains();

    return Object.keys(chains).reduce<Record<ChainId, Connection>>((acc, key) => {
      const chainId = key as ChainId;

      acc[chainId] = connectionsMap[chainId] || {
        chainId,
        customNodes: [],
        connectionType: ConnectionType.AUTO_BALANCE,
      };
      acc[chainId].canUseLightClient = lightClientChains.includes(chainId);

      return acc;
    }, {});
  },
  target: $connections,
});

const readyToConnect = combineEvents({
  events: [populateConnectionsFx.done, populateMetadataFx.done, populateChainsFx.done],
  reset: networkStarted,
});

sample({
  clock: readyToConnect,
  source: $chains,
  fn: (chains) => {
    return Object.keys(chains).map((chainId) => chainId as ChainId);
  },
  target: series(chainConnected),
});

sample({
  clock: chainConnected,
  source: {
    chains: $chains,
    connections: $connections,
    metadata: $metadata,
  },
  filter: ({ connections }, chainId) => {
    return !connections[chainId] || networkUtils.isEnabledConnection(connections[chainId]);
  },
  fn: (store, chainId) => {
    const connection = store.connections[chainId];

    const providerType = networkUtils.isLightClientConnection(connection)
      ? ProviderType.LIGHT_CLIENT
      : ProviderType.WEB_SOCKET;

    const nodes =
      !connection || networkUtils.isAutoBalanceConnection(connection)
        ? [...(store.chains[chainId]?.nodes || []), ...(connection?.customNodes || [])].map((node) => node.url)
        : [connection?.activeNode?.url || ''];

    const metadata = networkUtils.getNewestMetadata(store.metadata)[chainId];

    return {
      chainId,
      nodes,
      metadata,
      providerType,
      // set true in case of some network issues
      DEBUG_NETWORKS: false,
    };
  },
  target: createProviderFx,
});

sample({
  clock: createProviderFx.done,
  source: $providers,
  fn: (providers, { params, result: provider }) => ({
    ...providers,
    [params.chainId]: provider,
  }),
  target: $providers,
});

sample({
  clock: createProviderFx.done,
  source: $connectionStatuses,
  fn: (statuses, { params }) => ({
    ...statuses,
    [params.chainId]: ConnectionStatus.CONNECTING,
  }),
  target: $connectionStatuses,
});

sample({
  clock: connected,
  source: { providers: $providers, apis: $apis },
  fn: ({ providers, apis }, chainId) => ({
    chainId,
    provider: providers[chainId],
    existingApi: apis[chainId] ?? null,
  }),
  target: createApiFx,
});

sample({
  clock: createApiFx.done,
  source: $apis,
  fn: (apis, { result, params }) => {
    return { ...apis, [params.chainId]: result };
  },
  target: $apis,
});

sample({
  clock: createApiFx.done,
  source: $connectionStatuses,
  fn: (statuses, { params }) => ({
    newStatuses: { ...statuses, [params.chainId]: ConnectionStatus.CONNECTED },
    event: { chainId: params.chainId, status: ConnectionStatus.CONNECTED },
  }),
  target: spread({
    newStatuses: $connectionStatuses,
    event: connectionStatusChanged,
  }),
});

sample({
  clock: disconnected,
  source: $connectionStatuses,
  fn: (statuses, chainId) => ({
    newStatuses: { ...statuses, [chainId]: ConnectionStatus.DISCONNECTED },
    event: { chainId, status: ConnectionStatus.DISCONNECTED },
  }),
  target: spread({
    newStatuses: $connectionStatuses,
    event: connectionStatusChanged,
  }),
});

sample({
  clock: failed,
  source: $connectionStatuses,
  fn: (statuses, chainId) => ({
    newStatuses: { ...statuses, [chainId]: ConnectionStatus.ERROR },
    event: { chainId, status: ConnectionStatus.ERROR },
  }),
  target: spread({
    newStatuses: $connectionStatuses,
    event: connectionStatusChanged,
  }),
});

sample({
  clock: chainDisconnected,
  source: {
    apis: $apis,
    providers: $providers,
  },
  filter: ({ apis, providers }, chainId) => {
    return nonNullable(apis[chainId]) && nonNullable(providers[chainId]);
  },
  fn: ({ apis, providers }, chainId) => ({
    api: apis[chainId],
    provider: providers[chainId],
  }),
  target: disconnectConnectionFx,
});

// =====================================================
// ================ Metadata section ===================
// =====================================================

const metadataReceived = createEvent<NoID<ChainMetadata>>();
const saveMetadata = createBuffer({ source: metadataReceived, timeframe: 2000 });
const removeMetadata = createEvent<ApiPromise>();

sample({
  clock: removeMetadata,
  source: $metadata,
  fn: (list, removed) => {
    return list.filter((x) => x.chainId === removed.genesisHash.toHex()).map((x) => x.id);
  },
  target: removeMetadataFx,
});

sample({
  clock: createApiFx.done,
  source: $metadata,
  fn: (metadata, { params, result }) => {
    const cachedVersion = metadata.find((m) => m.chainId === params.chainId)?.runtimeVersion ?? null;

    return {
      api: result,
      cachedVersion,
    };
  },
  target: subscribeRuntimeVersionFx,
});

sample({
  clock: subscribeRuntimeVersionFx.doneData,
  source: $metadataSubscriptions,
  fn: (subscriptions, { chainId, unsubscribe }) => ({
    ...subscriptions,
    [chainId]: unsubscribe,
  }),
  target: $metadataSubscriptions,
});

sample({
  clock: disconnectConnectionFx.doneData,
  source: $metadataSubscriptions,
  filter: (subscriptions, chainId) => nonNullable(subscriptions[chainId]),
  fn: (subscriptions, chainId) => subscriptions[chainId],
  target: unsubscribeMetadataFx,
});

sample({
  clock: disconnectConnectionFx.doneData,
  source: {
    apis: $apis,
    providers: $providers,
    subscriptions: $metadataSubscriptions,
  },
  fn: ({ apis, providers, subscriptions }, chainId) => {
    const { [chainId]: _a, ...restApis } = apis;
    const { [chainId]: _p, ...restProviders } = providers;
    const { [chainId]: _s, ...restMetadataSubs } = subscriptions;

    return {
      newApis: restApis,
      newProviders: restProviders,
      newMetadataSubs: restMetadataSubs,
    };
  },
  target: spread({
    newApis: $apis,
    newProviders: $providers,
    newMetadataSubs: $metadataSubscriptions,
  }),
});

sample({
  clock: saveMetadata,
  target: saveMetadataFx,
});

sample({
  clock: saveMetadataFx.doneData,
  source: $metadata,
  filter: (_, newMetadata) => nonNullable(newMetadata),
  fn: (metadata, newMetadata) => {
    const oldMetadata = metadata.filter(({ chainId }) => newMetadata!.find((m) => m.chainId === chainId));
    const cleanMetadata = metadata.filter((x) => !oldMetadata.includes(x));

    return {
      metadata: cleanMetadata.concat(newMetadata!),
      oldMetadata: oldMetadata.map((x) => x.id),
    };
  },
  target: spread({
    metadata: $metadata,
    oldMetadata: removeMetadataFx,
  }),
});

export const networkModel = {
  $chains,
  $apis,
  $connectionStatuses,
  $connections,

  events: {
    networkStarted,
    chainConnected,
    chainDisconnected,
  },

  output: {
    connectionStatusChanged,
  },

  _test: {
    $providers,
  },
};
