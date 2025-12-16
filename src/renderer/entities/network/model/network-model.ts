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

// Track when connections enter CONNECTING state to detect stuck connections
const $connectingStartTimes = createStore<Record<ChainId, number>>({});
const STUCK_CONNECTION_THRESHOLD = 60000; // 60 seconds

// Mutex to prevent concurrent API creation for the same chain
const apiCreationLocks = new Set<ChainId>();

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
    console.log(`[DEBUG] createProviderFx START for chainId: ${chainId}`, {
      providerType,
      nodesCount: nodes?.length || 0,
      hasMetadata: !!metadata,
      DEBUG_NETWORKS,
    });

    const boundDisconnected = scopeBind(disconnected, { safe: true });
    const boundFailed = scopeBind(failed, { safe: true });
    const boundChainConnected = scopeBind(chainConnected, { safe: true });

    const provider = networkService.createProvider(
      chainId,
      providerType,
      { nodes, metadata },
      {
        onConnected: () => {
          console.log(`[DEBUG] Provider onConnected event for chainId: ${chainId}`, {
            timestamp: new Date().toISOString(),
          });
          // VALIDATION: Check if API exists and is connected when provider reconnects
          // eslint-disable-next-line effector/no-getState
          const currentApis = $apis.getState();
          // eslint-disable-next-line effector/no-getState
          const currentStatuses = $connectionStatuses.getState();
          // eslint-disable-next-line effector/no-getState
          const currentProviders = $providers.getState();
          const api = currentApis[chainId];
          const status = currentStatuses[chainId];
          const provider = currentProviders[chainId];

          console.log(`[VALIDATION] Provider onConnected - checking state for chainId: ${chainId}`, {
            hasApi: !!api,
            apiIsConnected: api?.isConnected,
            apiIsReady: api?.isReady,
            currentStatus: status,
            hasProvider: !!provider,
            providerType: provider?.constructor.name,
          });

          // FIX: Trigger API recreation when provider reconnects but API is missing or disconnected
          // Use mutex to prevent concurrent API creation
          if (!api || !api.isConnected) {
            // Check if API creation is already in progress for this chain
            if (apiCreationLocks.has(chainId)) {
              console.log(
                `[MUTEX] API creation already in progress for chainId: ${chainId}, skipping duplicate request`,
              );
              return;
            }

            console.warn(`[VALIDATION] Provider reconnected but API missing/disconnected for chainId: ${chainId}`, {
              shouldTriggerApiCreation: true,
              currentStatus: status,
            });
            console.log(`[FIX] Triggering chainConnected event to recreate API for chainId: ${chainId}`);
            boundChainConnected(chainId);
          }

          if (DEBUG_NETWORKS) {
            console.info('🟢 Provider connected ==> ', chainId);
          }
        },
        onDisconnected: () => {
          console.log(`[DEBUG] Provider onDisconnected event for chainId: ${chainId}`);
          if (DEBUG_NETWORKS) {
            console.info('🟠 Provider disconnected ==> ', chainId);
          }
          boundDisconnected(chainId);
        },
        onError: (error?: unknown) => {
          console.error(`[DEBUG] Provider onError event for chainId: ${chainId}`, error);
          if (DEBUG_NETWORKS) {
            console.info('🔴 Provider error ==> ', chainId);
          }
          boundFailed(chainId);
        },
      },
    );

    provider.onMetadataReceived(({ metadata, metadataVersion, runtimeVersion }) => {
      console.log(`[DEBUG] Provider metadata received for chainId: ${chainId}`, {
        metadataVersion,
        runtimeVersion,
      });
      metadataReceived({ chainId, metadata, metadataVersion, runtimeVersion });
    });

    if (providerType === ProviderType.WEB_SOCKET) {
      console.log(`[DEBUG] createProviderFx COMPLETE (WebSocket) for chainId: ${chainId}`);
      return provider;
    }

    /**
     * HINT: Light Client provider must be connected manually GitHub Light
     * Client section -
     * https://github.com/polkadot-js/api/tree/master/packages/rpc-provider#readme
     */
    console.log(`[DEBUG] createProviderFx CONNECTING (Light Client) for chainId: ${chainId}`);
    return provider
      .connect()
      .then(() => {
        console.log(`[DEBUG] createProviderFx COMPLETE (Light Client) for chainId: ${chainId}`);
        return provider;
      })
      .catch((error) => {
        console.error(`[DEBUG] createProviderFx ERROR (Light Client connect) for chainId: ${chainId}`, error);
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
  // MUTEX: Check if API creation is already in progress for this chain
  if (apiCreationLocks.has(chainId)) {
    console.log(`[MUTEX] API creation already in progress for chainId: ${chainId}, skipping duplicate request`);
    // Wait for the existing API creation to complete
    // eslint-disable-next-line effector/no-getState
    const currentApis = $apis.getState();
    const existingApiInstance = currentApis[chainId];
    if (existingApiInstance && existingApiInstance.isConnected) {
      return existingApiInstance;
    }
    // If no connected API exists, wait a bit and check again
    await new Promise((resolve) => setTimeout(resolve, 100));
    // eslint-disable-next-line effector/no-getState
    const apisAfterWait = $apis.getState();
    const apiAfterWait = apisAfterWait[chainId];
    if (apiAfterWait && apiAfterWait.isConnected) {
      return apiAfterWait;
    }
    // If still no API, throw to trigger retry
    throw new Error(`API creation already in progress for chainId: ${chainId}`);
  }

  // MUTEX: Acquire lock
  apiCreationLocks.add(chainId);
  console.log(`[MUTEX] Acquired lock for API creation, chainId: ${chainId}`);

  try {
    console.log(`[DEBUG] createApiFx START for chainId: ${chainId}`, {
      hasExistingApi: nonNullable(existingApi),
      providerType: provider.constructor.name,
    });

    if (nonNullable(existingApi)) {
      // VALIDATION: Check if existing API is actually usable
      const apiIsConnected = existingApi.isConnected;
      const apiIsReady = existingApi.isReady;

      console.log(`[VALIDATION] createApiFx - existing API check for chainId: ${chainId}`, {
        apiIsConnected,
        apiIsReady: typeof apiIsReady === 'object' ? 'Promise' : apiIsReady,
        apiType: existingApi.constructor.name,
      });

      // FIX: If API exists but is disconnected, create a new one instead of reusing the disconnected one
      if (!apiIsConnected) {
        console.warn(`[VALIDATION] Existing API is disconnected for chainId: ${chainId}`, {
          shouldRecreate: true,
          currentApiState: {
            isConnected: apiIsConnected,
            hasProvider: !!provider,
          },
        });
        console.log(`[FIX] Creating new API instead of reusing disconnected API for chainId: ${chainId}`);
        // Fall through to create a new API
      } else {
        console.log(`[DEBUG] createApiFx SKIP (existing API is connected) for chainId: ${chainId}`);
        return Promise.resolve(existingApi);
      }
    }

    const api = networkService.createApi(chainId, provider);
    const startTime = Date.now();
    const CONNECTION_TIMEOUT = 30000; // 30 seconds

    // Set up timeout detection
    const timeoutId = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      console.warn(`[DEBUG] createApiFx TIMEOUT WARNING for chainId: ${chainId}`, {
        elapsedMs: elapsed,
        apiIsConnected: api.isConnected,
        apiIsReady: api.isReady,
      });
    }, CONNECTION_TIMEOUT);

    try {
      console.log(`[DEBUG] createApiFx WAITING for api.isReady for chainId: ${chainId}`);

      // VALIDATION: Log provider state before waiting
      type ProviderWithMethods = { connect?: () => unknown; disconnect?: () => unknown };
      const providerWithMethods: ProviderWithMethods = provider;
      console.log(`[VALIDATION] createApiFx - provider state before api.isReady for chainId: ${chainId}`, {
        providerType: provider.constructor.name,
        providerHasConnect: typeof providerWithMethods.connect === 'function',
        providerHasDisconnect: typeof providerWithMethods.disconnect === 'function',
      });

      // VALIDATION: Check if api.isReady is actually a promise
      const readyPromise = api.isReady;
      if (!(readyPromise instanceof Promise)) {
        console.error(`[VALIDATION] api.isReady is not a Promise for chainId: ${chainId}`, {
          type: typeof readyPromise,
          value: readyPromise,
        });
      }

      await readyPromise;
      const elapsed = Date.now() - startTime;
      console.log(`[DEBUG] createApiFx SUCCESS for chainId: ${chainId}`, {
        elapsedMs: elapsed,
        apiIsConnected: api.isConnected,
      });
      clearTimeout(timeoutId);
      return api;
    } catch (error) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      console.error(`[DEBUG] createApiFx ERROR for chainId: ${chainId}`, {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        elapsedMs: elapsed,
        apiIsConnected: api.isConnected,
      });
      throw error;
    }
  } finally {
    // MUTEX: Release lock
    apiCreationLocks.delete(chainId);
    console.log(`[MUTEX] Released lock for API creation, chainId: ${chainId}`);
  }
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
  fn: (providers, { params, result: provider }) => {
    console.log(`[DEBUG] createProviderFx.done - storing provider for chainId: ${params.chainId}`, {
      providerType: provider.constructor.name,
    });
    return {
      ...providers,
      [params.chainId]: provider,
    };
  },
  target: $providers,
});

sample({
  clock: createProviderFx.done,
  source: { statuses: $connectionStatuses, startTimes: $connectingStartTimes },
  fn: ({ statuses, startTimes }, { params }) => {
    const now = Date.now();
    console.log(`[DEBUG] Setting CONNECTING status for chainId: ${params.chainId}`, {
      previousStatus: statuses[params.chainId],
      timestamp: new Date().toISOString(),
    });
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
  source: { apis: $apis, statuses: $connectionStatuses },
  fn: ({ apis, statuses }, { params, result: provider }) => {
    const existingApi = apis[params.chainId];

    console.log(`[DEBUG] Triggering createApiFx after provider creation for chainId: ${params.chainId}`, {
      hasExistingApi: !!existingApi,
    });

    // VALIDATION: Log detailed state when triggering createApiFx
    console.log(`[VALIDATION] Triggering createApiFx - state check for chainId: ${params.chainId}`, {
      hasExistingApi: !!existingApi,
      existingApiIsConnected: existingApi?.isConnected,
      currentStatus: statuses[params.chainId],
      providerType: provider.constructor.name,
      willUseExistingApi: !!existingApi && existingApi.isConnected,
    });

    return {
      chainId: params.chainId,
      provider,
      existingApi: existingApi ?? null,
    };
  },
  target: createApiFx,
});

sample({
  clock: createApiFx.done,
  source: $apis,
  fn: (apis, { result, params }) => {
    console.log(`[DEBUG] createApiFx.done - storing API for chainId: ${params.chainId}`, {
      apiIsConnected: result.isConnected,
      apiIsReady: result.isReady,
    });
    return { ...apis, [params.chainId]: result };
  },
  target: $apis,
});

// HINT: We cannot rely on Provider.onConnected because it fires BEFORE we have API
sample({
  clock: createApiFx.done,
  source: { statuses: $connectionStatuses, startTimes: $connectingStartTimes },
  fn: ({ statuses, startTimes }, { params }) => {
    const elapsed = startTimes[params.chainId] ? Date.now() - startTimes[params.chainId] : 0;
    console.log(`[DEBUG] Setting CONNECTED status for chainId: ${params.chainId}`, {
      previousStatus: statuses[params.chainId],
      elapsedMs: elapsed,
      timestamp: new Date().toISOString(),
    });
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
  fn: ({ statuses, startTimes }, { params, error }) => {
    const elapsed = startTimes[params.chainId] ? Date.now() - startTimes[params.chainId] : 0;
    console.error(`[DEBUG] createApiFx.fail - setting ERROR status for chainId: ${params.chainId}`, {
      error,
      previousStatus: statuses[params.chainId],
      elapsedMs: elapsed,
      timestamp: new Date().toISOString(),
    });
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
  fn: ({ statuses, startTimes }, { params, error }) => {
    const elapsed = startTimes[params.chainId] ? Date.now() - startTimes[params.chainId] : 0;
    console.error(`[DEBUG] createProviderFx.fail - setting ERROR status for chainId: ${params.chainId}`, {
      error,
      previousStatus: statuses[params.chainId],
      elapsedMs: elapsed,
      timestamp: new Date().toISOString(),
    });
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
    const elapsed = startTimes[chainId] ? Date.now() - startTimes[chainId] : 0;
    console.log(`[DEBUG] disconnected event - setting DISCONNECTED status for chainId: ${chainId}`, {
      previousStatus: statuses[chainId],
      elapsedMs: elapsed,
      timestamp: new Date().toISOString(),
    });
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
    const elapsed = startTimes[chainId] ? Date.now() - startTimes[chainId] : 0;
    console.error(`[DEBUG] failed event - setting ERROR status for chainId: ${chainId}`, {
      previousStatus: statuses[chainId],
      elapsedMs: elapsed,
      timestamp: new Date().toISOString(),
    });
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

// Periodic check for stuck connections
const checkStuckConnectionsFx = createEffect(() => {
  const now = Date.now();
  // eslint-disable-next-line effector/no-getState
  const statuses = $connectionStatuses.getState();
  // eslint-disable-next-line effector/no-getState
  const startTimes = $connectingStartTimes.getState();
  // eslint-disable-next-line effector/no-getState
  const apis = $apis.getState();
  // eslint-disable-next-line effector/no-getState
  const providers = $providers.getState();

  const stuckConnections: { chainId: ChainId; elapsed: number }[] = [];

  // Use Object.keys to get properly typed ChainId keys
  // Object.keys returns string[] but we know all keys are ChainId from the store type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainIds = Object.keys(statuses) as ChainId[];
  for (const chainId of chainIds) {
    const status = statuses[chainId];
    if (status === ConnectionStatus.CONNECTING) {
      const startTime = startTimes[chainId];
      if (startTime) {
        const elapsed = now - startTime;
        if (elapsed > STUCK_CONNECTION_THRESHOLD) {
          stuckConnections.push({ chainId, elapsed });
          const api = apis[chainId];
          const provider = providers[chainId];
          console.warn(`[DEBUG] STUCK CONNECTION DETECTED for chainId: ${chainId}`, {
            elapsedMs: elapsed,
            hasApi: !!api,
            hasProvider: !!provider,
            apiIsConnected: api?.isConnected,
            apiIsReady: api?.isReady,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  if (stuckConnections.length > 0) {
    console.error(`[DEBUG] Found ${stuckConnections.length} stuck connection(s):`, stuckConnections);
  }
});

// Run stuck connection check every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    checkStuckConnectionsFx();
  }, 30000);
}

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
