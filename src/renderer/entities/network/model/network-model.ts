import { type ApiPromise } from '@polkadot/api';
import { type VoidFn } from '@polkadot/api/types';
import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { spread } from 'patronum';

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
  type Metadata,
  type NoID,
} from '@/shared/core';
import { series } from '@/shared/effector';
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
const subscribeMetadataFx = createEffect(async (api: ApiPromise): Promise<MetadataSubResult> => {
  const unsubscribe = await metadataService.subscribeMetadata(api, requestMetadataFx);

  return { chainId: api.genesisHash.toHex(), unsubscribe };
});

const requestMetadataFx = createEffect((api: ApiPromise): Promise<NoID<ChainMetadata>> => {
  return metadataService.requestMetadata(api);
});

const unsubscribeMetadataFx = createEffect((unsubscribe: VoidFn) => {
  unsubscribe();
});

const saveMetadataFx = createEffect((metadata: NoID<ChainMetadata>): Promise<ChainMetadata | undefined> => {
  return storageService.metadata.put(metadata);
});

const removeMetadataFx = createEffect((ids: ID[]): Promise<ID[] | undefined> => {
  return storageService.metadata.deleteAll(ids);
});

type ProviderMetadataParams = {
  provider: ProviderWithMetadata;
  metadata: Metadata;
};
const updateProviderMetadataFx = createEffect(({ provider, metadata }: ProviderMetadataParams) => {
  provider.updateMetadata(metadata);
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
      { nodes, metadata: metadata?.metadata },
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
  providers: Record<ChainId, ProviderWithMetadata>;
  apis: Record<ChainId, ApiPromise>;
};
const createApiFx = createEffect(async ({ chainId, providers, apis }: CreateApiParams): Promise<ApiPromise> => {
  if (chainId in apis) {
    const api = apis[chainId];
    await api.connect();

    return api;
  }

  return networkService.createApi(chainId, providers[chainId]);
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

sample({
  clock: populateConnectionsFx.doneData,
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
  fn: ({ providers, apis }, chainId) => ({ chainId, providers, apis }),
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

sample({
  clock: createApiFx.doneData,
  target: subscribeMetadataFx,
});

sample({
  clock: subscribeMetadataFx.doneData,
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
  clock: requestMetadataFx.doneData,
  source: $metadata,
  filter: (metadata, newMetadata) => {
    return metadata.every(({ chainId, version }) => {
      return chainId !== newMetadata.chainId || version !== newMetadata.version;
    });
  },
  fn: (_, metadata) => metadata,
  target: saveMetadataFx,
});

sample({
  clock: saveMetadataFx.doneData,
  source: $metadata,
  filter: (_, newMetadata) => Boolean(newMetadata),
  fn: (metadata, newMetadata) => {
    const oldMetadata = metadata.filter(({ chainId }) => chainId === newMetadata!.chainId).map(({ id }) => id);
    const cleanMetadata = metadata.filter(({ chainId }) => chainId !== newMetadata!.chainId);

    return {
      metadata: [...cleanMetadata, newMetadata!],
      oldMetadata,
    };
  },
  target: spread({
    metadata: $metadata,
    oldMetadata: removeMetadataFx,
  }),
});

sample({
  clock: saveMetadataFx.doneData,
  source: $providers,
  filter: (_, metadata) => nonNullable(metadata),
  fn: (providers, metadata) => ({
    provider: providers[metadata!.chainId],
    metadata: metadata!.metadata,
  }),
  target: updateProviderMetadataFx,
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
