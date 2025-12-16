import { type ApiPromise } from '@polkadot/api';
import { type VoidFn } from '@polkadot/api/types';
import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { persist } from 'effector-storage/local';
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
  type NoID,
} from '@/shared/core';
import { createBuffer, series } from '@/shared/effector';
import { dictionary, keys, nonNullable } from '@/shared/lib/utils';
import { networkUtils } from '../lib/network-utils';

const chainConnected = createEvent<ChainId>();
const chainDisconnected = createEvent<ChainId>();
const connectionStatusChanged = createEvent<{ chainId: ChainId; status: ConnectionStatus }>();

const disconnected = createEvent<ChainId>();
const failed = createEvent<ChainId>();

const $chains = createStore<Record<ChainId, Chain>>({});
const $chainsList = $chains.map((chains) => chainsService.sortChains(Object.values(chains)));

const $providers = createStore<Record<ChainId, ProviderWithMetadata>>({});
const $apis = createStore<Record<ChainId, ApiPromise>>({});

const $connectionData = createStore<Connection[]>([]);
const $connections = createStore<Record<ChainId, Connection>>({});
const $connectionStatuses = createStore<Record<ChainId, ConnectionStatus>>({});

const $metadata = createStore<ChainMetadata[]>([]);
const $metadataSubscriptions = createStore<Record<ChainId, VoidFn>>({});

const $populated = createStore(false);

// Track when connections enter CONNECTING state
const $connectingStartTimes = createStore<Record<ChainId, number>>({});

// Promise-based mutex to prevent concurrent API creation for the same chain
// Stores the promise of the API creation in progress, allowing concurrent requests to await the same promise
const apiCreationPromises = new Map<ChainId, Promise<ApiPromise>>();

const populateChainsFx = createEffect(async (): Promise<Record<ChainId, Chain> | null> => {
  const chains = await chainsService.getChainsData();
  return nonNullable(chains) ? chainsService.getChainsMap(chains) : null;
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

persist({
  key: 'chains_map',
  store: $chains,
  sync: true,
});

type MetadataSubResult = {
  chainId: ChainId;
  unsubscribe: VoidFn;
};
const subscribeRuntimeVersionFx = createEffect(async (api: ApiPromise): Promise<MetadataSubResult> => {
  const callback = scopeBind(removeOldMetadata, { safe: true });

  const unsubscribe = await metadataService.subscribeRuntimeVersion({
    api,
    callback,
  });

  return { chainId: api.genesisHash.toHex(), unsubscribe };
});

const unsubscribeMetadataFx = createEffect((unsubscribe: VoidFn) => {
  unsubscribe();
});

const saveMetadataFx = createEffect((metadata: NoID<ChainMetadata>[]) => {
  return storageService.metadata.createAll(metadata);
});

const removeMetadataFx = createEffect((metadata: ChainMetadata[]) => {
  if (metadata.length === 0) return [];
  return storageService.metadata.deleteAll(metadata.map((m) => m.id));
});

type CreateProviderParams = {
  chainId: ChainId;
  nodes: string[];
  metadata?: ChainMetadata;
  providerType: ProviderType;
  DEBUG_NETWORKS?: boolean;
};
const createProviderFx = createEffect(
  ({ chainId, nodes, metadata, providerType, DEBUG_NETWORKS }: CreateProviderParams) => {
    const boundDisconnected = scopeBind(disconnected, { safe: true });
    const boundFailed = scopeBind(failed, { safe: true });
    const boundChainConnected = scopeBind(chainConnected, { safe: true });

    const provider = networkService.createProvider(
      chainId,
      providerType,
      { nodes, metadata },
      {
        onConnected: () => {
          // Check if API exists and is connected when provider reconnects
          // eslint-disable-next-line effector/no-getState
          const currentApis = $apis.getState();
          const api = currentApis[chainId];

          // Trigger API recreation when provider reconnects but API is missing or disconnected
          // Use promise-based mutex to prevent concurrent API creation
          if (!api || !api.isConnected) {
            // Check if API creation is already in progress for this chain
            if (apiCreationPromises.has(chainId)) {
              return;
            }
            boundChainConnected(chainId);
          }

          if (DEBUG_NETWORKS) {
            console.info('🟢 Provider connected ==> ', chainId);
          }
        },
        onDisconnected: () => {
          if (DEBUG_NETWORKS) {
            console.info('🟠 Provider disconnected ==> ', chainId);
          }
          boundDisconnected(chainId);
        },
        onError: (error?: unknown) => {
          if (DEBUG_NETWORKS) {
            console.info('🔴 Provider error ==> ', chainId, error);
          } else {
            console.error('Provider error:', chainId, error);
          }
          boundFailed(chainId);
        },
      },
    );

    provider.onMetadataReceived(({ metadata, metadataVersion, runtimeVersion }) => {
      metadataReceived({ chainId, metadata, metadataVersion, runtimeVersion });
    });

    if (providerType === ProviderType.WEB_SOCKET) {
      return provider;
    }

    /**
     * HINT: Light Client provider must be connected manually GitHub Light
     * Client section -
     * https://github.com/polkadot-js/api/tree/master/packages/rpc-provider#readme
     */
    return provider
      .connect()
      .then(() => provider)
      .catch((error) => {
        throw error;
      });
  },
);

const createProvidersFx = series(createProviderFx);

type CreateApiParams = {
  chainId: ChainId;
  provider: ProviderWithMetadata;
  existingApi: ApiPromise | null;
};
const createApiFx = createEffect(async ({ chainId, provider, existingApi }: CreateApiParams): Promise<ApiPromise> => {
  // Check if API creation is already in progress for this chain
  const existingPromise = apiCreationPromises.get(chainId);
  if (existingPromise) {
    // Return the existing promise - concurrent requests will await the same promise
    return existingPromise;
  }

  // Check if we already have a connected API
  if (nonNullable(existingApi) && existingApi.isConnected) {
    return Promise.resolve(existingApi);
  }

  // Create the API creation promise
  const apiPromise = (async (): Promise<ApiPromise> => {
    try {
      // If API exists but is disconnected, create a new one instead of reusing the disconnected one
      const api = networkService.createApi(chainId, provider);
      await api.isReady;
      return api;
    } finally {
      // Clean up the promise from the map when done (success or failure)
      apiCreationPromises.delete(chainId);
    }
  })();

  // Store the promise so concurrent requests can await it
  apiCreationPromises.set(chainId, apiPromise);

  return apiPromise;
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

const startNetworksFx = createEffect(() => {
  return Promise.all([populateChainsFx(), populateMetadataFx(), populateConnectionsFx()]);
});

sample({
  clock: populateChainsFx.doneData,
  filter: (data) => nonNullable(data),
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
  target: $connectionData,
});

sample({
  source: {
    chains: $chains,
    connectionData: $connectionData,
  },
  fn: ({ chains, connectionData }) => {
    const connectionsMap = dictionary(connectionData, 'chainId');
    const lightClientChains = networkUtils.getLightClientChains();

    return keys(chains).reduce<Record<ChainId, Connection>>((acc, chainId) => {
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
  clock: combineEvents({
    events: [createProvidersFx.done],
  }),
  fn: () => true,
  target: $populated,
});

sample({
  clock: startNetworksFx,
  fn: () => false,
  target: $populated,
});

const readyToConnect = combineEvents({
  events: [populateConnectionsFx.doneData, populateMetadataFx.doneData, populateChainsFx.doneData],
  reset: startNetworksFx,
});

sample({
  clock: readyToConnect,
  source: {
    chains: $chains,
    connections: $connectionData,
    metadata: $metadata,
  },
  fn: ({ connections, metadata, chains }) => {
    return Object.values(chains)
      .filter((chain) => {
        const connection = connections.find((c) => c.chainId === chain.chainId);
        return !connection || networkUtils.isEnabledConnection(connection);
      })
      .map<CreateProviderParams>((chain) => {
        const connection = connections.find((c) => c.chainId === chain.chainId) ?? null;
        const providerType =
          connection && networkUtils.isLightClientConnection(connection)
            ? ProviderType.LIGHT_CLIENT
            : ProviderType.WEB_SOCKET;

        const nodes = networkUtils.getChainNodes(chain, connection);
        const actualMetadata = networkUtils.getNewestMetadata(metadata)[chain.chainId];

        return {
          chainId: chain.chainId,
          nodes,
          metadata: actualMetadata,
          providerType,
          // set true in case of some network issues
          DEBUG_NETWORKS: false,
        };
      });
  },
  target: createProvidersFx,
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

    const nodes = networkUtils.getChainNodes(store.chains[chainId], connection);
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
  source: { statuses: $connectionStatuses, startTimes: $connectingStartTimes },
  fn: ({ statuses, startTimes }, { params }) => {
    const now = Date.now();
    return {
      newStatuses: {
        ...statuses,
        [params.chainId]: ConnectionStatus.CONNECTING,
      },
      newStartTimes: {
        ...startTimes,
        [params.chainId]: now,
      },
    };
  },
  target: spread({
    newStatuses: $connectionStatuses,
    newStartTimes: $connectingStartTimes,
  }),
});

sample({
  clock: createProviderFx.done,
  source: $apis,
  fn: (apis, { params, result: provider }) => ({
    chainId: params.chainId,
    provider,
    existingApi: apis[params.chainId] ?? null,
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

// HINT: We cannot rely on Provider.onConnected because it fires BEFORE we have API
sample({
  clock: createApiFx.done,
  source: { statuses: $connectionStatuses, startTimes: $connectingStartTimes },
  fn: ({ statuses, startTimes }, { params }) => {
    const { [params.chainId]: _, ...newStartTimes } = startTimes;
    return {
      newStatuses: { ...statuses, [params.chainId]: ConnectionStatus.CONNECTED },
      newStartTimes,
      event: { chainId: params.chainId, status: ConnectionStatus.CONNECTED },
    };
  },
  target: spread({
    newStatuses: $connectionStatuses,
    newStartTimes: $connectingStartTimes,
    event: connectionStatusChanged,
  }),
});

// Add error handling for createApiFx failures
sample({
  clock: createApiFx.fail,
  source: { statuses: $connectionStatuses, startTimes: $connectingStartTimes },
  fn: ({ statuses, startTimes }, { params }) => {
    const { [params.chainId]: _, ...newStartTimes } = startTimes;
    return {
      newStatuses: { ...statuses, [params.chainId]: ConnectionStatus.ERROR },
      newStartTimes,
      event: { chainId: params.chainId, status: ConnectionStatus.ERROR },
    };
  },
  target: spread({
    newStatuses: $connectionStatuses,
    newStartTimes: $connectingStartTimes,
    event: connectionStatusChanged,
  }),
});

// Add error handling for createProviderFx failures
sample({
  clock: createProviderFx.fail,
  source: { statuses: $connectionStatuses, startTimes: $connectingStartTimes },
  fn: ({ statuses, startTimes }, { params }) => {
    const { [params.chainId]: _, ...newStartTimes } = startTimes;
    return {
      newStatuses: { ...statuses, [params.chainId]: ConnectionStatus.ERROR },
      newStartTimes,
      event: { chainId: params.chainId, status: ConnectionStatus.ERROR },
    };
  },
  target: spread({
    newStatuses: $connectionStatuses,
    newStartTimes: $connectingStartTimes,
    event: connectionStatusChanged,
  }),
});

sample({
  clock: disconnected,
  source: { statuses: $connectionStatuses, startTimes: $connectingStartTimes },
  fn: ({ statuses, startTimes }, chainId) => {
    const { [chainId]: _, ...newStartTimes } = startTimes;
    return {
      newStatuses: { ...statuses, [chainId]: ConnectionStatus.DISCONNECTED },
      newStartTimes,
      event: { chainId, status: ConnectionStatus.DISCONNECTED },
    };
  },
  target: spread({
    newStatuses: $connectionStatuses,
    newStartTimes: $connectingStartTimes,
    event: connectionStatusChanged,
  }),
});

sample({
  clock: failed,
  source: { statuses: $connectionStatuses, startTimes: $connectingStartTimes },
  fn: ({ statuses, startTimes }, chainId) => {
    const { [chainId]: _, ...newStartTimes } = startTimes;
    return {
      newStatuses: { ...statuses, [chainId]: ConnectionStatus.ERROR },
      newStartTimes,
      event: { chainId, status: ConnectionStatus.ERROR },
    };
  },
  target: spread({
    newStatuses: $connectionStatuses,
    newStartTimes: $connectingStartTimes,
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
const removeOldMetadata = createEvent<{ chainId: ChainId; receivedVersion: number }>();

sample({
  clock: removeOldMetadata,
  source: $metadata,
  fn: (metadata, { chainId, receivedVersion }) => {
    return metadata.filter((x) => x.chainId === chainId && x.runtimeVersion < receivedVersion);
  },
  target: removeMetadataFx,
});

sample({
  clock: createApiFx.doneData,
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
      oldMetadata: oldMetadata,
    };
  },
  target: spread({
    metadata: $metadata,
    oldMetadata: removeMetadataFx,
  }),
});

export const networkModel = {
  $populated,
  $chains,
  $chainsList,
  $apis,
  $connectionStatuses,
  $connections,

  startNetworks: startNetworksFx,

  events: {
    chainConnected,
    chainDisconnected,
    connectionsPopulated: populateConnectionsFx.doneData,
  },

  output: {
    connectionStatusChanged,
  },

  _test: {
    $providers,
  },
};
