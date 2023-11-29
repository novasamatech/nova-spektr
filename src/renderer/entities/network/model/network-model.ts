import { createEffect, createEvent, createStore, forward, sample } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { UnsubscribePromise } from '@polkadot/api/types';
import { keyBy } from 'lodash';
import { combineEvents } from 'patronum';

import { ProviderType, chainsService, networkService } from '../lib';
import {
  Chain,
  ChainId,
  Connection,
  ConnectionStatus,
  ConnectionType,
  RpcNode,
  kernelModel,
} from '@renderer/shared/core';
import { useMetadata } from '../lib/metadataService';
import { storageService } from '@shared/api/storage';

const chains = chainsService.getChainsMap();

const defaultStatuses = Object.values(chains).reduce((acc, chain) => {
  acc[chain.chainId] = ConnectionStatus.DISCONNECTED;

  return acc;
}, {} as Record<ChainId, ConnectionStatus>);

const metadataStorage = useMetadata();

const $providers = createStore<Record<ChainId, ProviderInterface>>({});
const $apis = createStore<Record<ChainId, ApiPromise>>({});
const $connectionStatuses = createStore(defaultStatuses);
const $chains = createStore<Record<ChainId, Chain>>(chains);
const $connections = createStore<Record<ChainId, Connection>>({});

const $metadataSubscriptions = createStore<Record<ChainId, UnsubscribePromise>>({});

const chainStarted = createEvent<ChainId>();
const disconnectStarted = createEvent<ChainId>();

const lightClientSelected = createEvent<ChainId>();
const singleNodeSelected = createEvent<{ chainId: ChainId; node: RpcNode }>();
const autoBalanceSelected = createEvent<ChainId>();

type NodeEventParams = {
  rpcNode: RpcNode;
  chainId: ChainId;
  oldNode?: RpcNode;
};

const rpcNodeAdded = createEvent<NodeEventParams>();
const rpcNodeUpdated = createEvent<NodeEventParams>();
const rpcNodeRemoved = createEvent<NodeEventParams>();

const connected = createEvent<ChainId>();
const disconnected = createEvent<ChainId>();
const failed = createEvent<ChainId>();

const metadataUnsubscribed = createEvent<[ChainId, UnsubscribePromise][]>();

type ProviderTypeSwitchedParams = {
  chainId: ChainId;
  type: ProviderType;
};
const providerTypeSwitched = createEvent<ProviderTypeSwitchedParams>();

const populateConnectionsFx = createEffect((): Promise<Connection[]> => {
  return storageService.connections.readAll();
});

const createConnectionFx = createEffect(async (connection: Omit<Connection, 'id'>): Promise<Connection | undefined> => {
  return storageService.connections.create(connection);
});

const updateConnectionFx = createEffect(async ({ id, ...rest }: Connection): Promise<Connection> => {
  await storageService.connections.update(id, rest);

  return { id, ...rest };
});

const deleteConnectionFx = createEffect(async (connectionId: number): Promise<number> => {
  await storageService.connections.delete(connectionId);

  return connectionId;
});

const subscribeMetadataFx = createEffect(
  async (apiEntries: [ChainId, ApiPromise][]): Promise<[ChainId, UnsubscribePromise][]> => {
    return apiEntries.map(([chainId, api]) => [
      chainId,
      metadataStorage.subscribeMetadata(api, () => syncMetadataFx(api)),
    ]);
  },
);

const unsubscribeMetadataFx = createEffect(
  async (unsubscribeEntries: [ChainId, UnsubscribePromise][]): Promise<void> => {
    unsubscribeEntries.forEach(async ([_, unsubscribe]) => {
      await unsubscribe;
    });
  },
);

const syncMetadataFx = createEffect(async (api: ApiPromise) => {
  return await metadataStorage.syncMetadata(api);
});

sample({
  clock: connected,
  source: $connectionStatuses,
  filter: (statuses, chainId) => statuses[chainId] !== ConnectionStatus.CONNECTED,
  fn: (statuses, chainId) => ({
    ...statuses,
    [chainId]: ConnectionStatus.CONNECTED,
  }),
  target: $connectionStatuses,
});

sample({
  clock: disconnected,
  source: $connectionStatuses,
  filter: (statuses, chainId) => statuses[chainId] !== ConnectionStatus.DISCONNECTED,
  fn: (statuses, chainId) => ({
    ...statuses,
    [chainId]: ConnectionStatus.DISCONNECTED,
  }),
  target: $connectionStatuses,
});

const initConnectionsFx = createEffect(async () => {
  for (const chainId of Object.keys(chains)) {
    chainStarted(chainId as ChainId);
  }
});

type DisconnectParams = {
  provider: ProviderInterface;
  api: ApiPromise;
};
const disconnectFx = createEffect(async ({ provider, api }: DisconnectParams): Promise<void> => {
  await networkService.disconnect(provider, api);
});

type ReconnectParams = {
  provider: ProviderInterface;
  api: ApiPromise;
  chainId: ChainId;
};
const reconnectFx = createEffect(async ({ provider, api, chainId }: ReconnectParams): Promise<void> => {
  await disconnectFx({ provider, api });

  chainStarted(chainId);
});

type CreateProviderParams = {
  chainId: ChainId;
  nodes: string[];
  providerType: ProviderType;
};
const createProviderFx = createEffect(({ chainId, providerType, nodes }: CreateProviderParams): ProviderInterface => {
  const provider = networkService.createProvider(
    chainId,
    nodes,
    providerType,
    () => {
      console.info('🟢 provider connected ==> ', chainId);

      connected(chainId);
    },
    () => {
      console.info('🔶 provider disconnected ==> ', chainId);

      disconnected(chainId);
    },
    () => {
      console.info('🔴 provider error ==> ', chainId);

      failed(chainId);
    },
  );

  return provider;
});

type CreateApiParams = {
  chainId: ChainId;
  provider: ProviderInterface;
};
const createApiFx = createEffect(async ({ chainId, provider }: CreateApiParams): Promise<ApiPromise | undefined> => {
  if (provider.isConnected) {
    try {
      const api = await networkService.createApi(provider);

      return api;
    } catch (e) {
      console.log('error during create api', e);
    }
  } else {
    setTimeout(() => {
      createApiFx({
        chainId,
        provider,
      });
    }, 1000);
  }
});

forward({
  from: combineEvents({
    events: [kernelModel.events.appStarted, populateConnectionsFx.done],
  }),
  to: initConnectionsFx,
});

sample({
  clock: chainStarted,
  source: {
    connections: $connections,
    chains: $chains,
  },
  filter: ({ connections }, chainId) => {
    return !connections[chainId] || connections[chainId].connectionType !== ConnectionType.DISABLED;
  },
  fn: ({ connections, chains }, chainId: ChainId) => {
    const connection = connections[chainId];

    const providerType =
      connection?.connectionType === ConnectionType.LIGHT_CLIENT ? ProviderType.LIGHT_CLIENT : ProviderType.WEB_SOCKET;

    const nodes =
      connection?.connectionType === ConnectionType.AUTO_BALANCE || !connection
        ? [...(chains[chainId]?.nodes || []), ...(connection?.customNodes || [])].map((node) => node.url)
        : [connection?.activeNode?.url || ''];

    return {
      chainId,
      providerType,
      nodes,
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
  fn: ({ params, result: provider }) => ({
    chainId: params.chainId,
    provider,
  }),
  target: createApiFx,
});

sample({
  clock: createApiFx.doneData,
  source: $apis,
  filter: (_, api) => api !== undefined,
  fn: (apis, api) => ({
    ...apis,
    [api!.genesisHash.toHex()]: api!,
  }),
  target: $apis,
});

// =====================================================
// ================ Metadata section ===================
// =====================================================

sample({
  clock: $connectionStatuses,
  source: {
    apis: $apis,
    subscriptions: $metadataSubscriptions,
  },
  fn: ({ apis, subscriptions }, statuses) =>
    Object.entries(apis).filter(([chainId]) => {
      return statuses[chainId as ChainId] === ConnectionStatus.CONNECTED && !subscriptions[chainId as ChainId];
    }) as [ChainId, ApiPromise][],
  target: subscribeMetadataFx,
});

sample({
  clock: $connectionStatuses,
  source: {
    subscriptions: $metadataSubscriptions,
  },
  fn: ({ subscriptions }, statuses) =>
    Object.entries(subscriptions).filter(([chainId]) => {
      return statuses[chainId as ChainId] === ConnectionStatus.DISCONNECTED && subscriptions[chainId as ChainId];
    }) as [ChainId, UnsubscribePromise][],
  target: [unsubscribeMetadataFx, metadataUnsubscribed],
});

sample({
  clock: metadataUnsubscribed,
  source: $metadataSubscriptions,
  fn: (subscriptions, unsubscribes) => {
    unsubscribes.forEach(([chainId]) => {
      delete subscriptions[chainId as ChainId];
    });

    return subscriptions;
  },
  target: $metadataSubscriptions,
});

sample({
  clock: subscribeMetadataFx.doneData,
  source: $metadataSubscriptions,
  fn: (subscriptions, unsubscribes) => {
    unsubscribes.forEach(([chainId, cb]) => {
      subscriptions[chainId as ChainId] = cb;
    });

    return subscriptions;
  },
  target: $metadataSubscriptions,
});

// =====================================================
// =============== Connection section ==================
// =====================================================

$connections
  .on(populateConnectionsFx.doneData, (_, connections) => {
    return keyBy(connections, 'chainId');
  })
  .on(createConnectionFx.doneData, (state, connection) => {
    return connection
      ? {
          ...state,
          [connection.chainId]: connection,
        }
      : state;
  })
  .on(deleteConnectionFx.doneData, (state, connectionId) => {
    const deletedConnection = Object.values(state).find((c) => c.id === connectionId);

    if (!deletedConnection?.chainId) return state;

    const { [deletedConnection.chainId]: _, ...newConnections } = state;

    return newConnections;
  })
  .on(updateConnectionFx.doneData, (state, connection) => {
    return {
      ...state,
      [connection.chainId]: connection,
    };
  });

forward({
  from: kernelModel.events.appStarted,
  to: populateConnectionsFx,
});

sample({
  clock: rpcNodeAdded,
  source: $connections,
  fn: (connections, { chainId, rpcNode }) => {
    const connection = connections[chainId];

    connection.customNodes = (connection.customNodes || []).concat(rpcNode);
    connection.activeNode = rpcNode;

    return connection;
  },
  target: updateConnectionFx,
});

sample({
  clock: rpcNodeUpdated,
  source: $connections,
  filter: (_, { oldNode }) => !!oldNode,
  fn: (connections, { chainId, oldNode, rpcNode }) => {
    const connection = connections[chainId];

    connection.customNodes = (connection.customNodes || []).map((node) => {
      if (node.url === oldNode!.url && node.name === oldNode!.name) return rpcNode;

      return node;
    });

    return connection;
  },
  target: updateConnectionFx,
});

sample({
  clock: rpcNodeRemoved,
  source: $connections,
  fn: (connections, { chainId, rpcNode }) => {
    const connection = connections[chainId];

    connection.customNodes = (connection.customNodes || []).filter((node) => node.url !== rpcNode.url);

    return connection;
  },
  target: updateConnectionFx,
});

sample({
  clock: updateConnectionFx.done,
  source: $chains,
  filter: (chains, { params: connection }) => {
    const activeNode = connection.activeNode;
    const nodes = (connection.customNodes || []).concat(chains[connection.chainId].nodes || []);
    const isNodeFound = nodes.some((node) => node.url === activeNode?.url);

    return !isNodeFound;
  },
  fn: (chains, { params: connection }) => ({
    ...connection,
    activeNode: chains[connection.chainId].nodes[0],
  }),
  target: updateConnectionFx,
});

// =====================================================
// ============== Reconnect section ====================
// =====================================================

sample({
  clock: lightClientSelected,
  source: $connections,
  fn: (connections, chainId) => {
    const connection = connections[chainId];

    return {
      ...connection,
      connectionType: ConnectionType.LIGHT_CLIENT,
    };
  },
  target: updateConnectionFx,
});

sample({
  clock: autoBalanceSelected,
  source: $connections,
  fn: (connections, chainId) => {
    const connection = connections[chainId];

    return {
      ...connection,
      connectionType: ConnectionType.AUTO_BALANCE,
    };
  },
  target: updateConnectionFx,
});

sample({
  clock: singleNodeSelected,
  source: $connections,
  fn: (connections, { chainId, node }) => {
    const connection = connections[chainId];

    return {
      ...connection,
      connectionType: ConnectionType.RPC_NODE,
      activeNode: node,
    };
  },
  target: updateConnectionFx,
});

sample({
  clock: updateConnectionFx.doneData,
  source: {
    providers: $providers,
    apis: $apis,
  },
  fn: ({ providers, apis }, connection) => ({
    provider: providers[connection.chainId],
    api: apis[connection.chainId],
    chainId: connection.chainId,
  }),
  target: reconnectFx,
});

sample({
  clock: disconnectStarted,
  source: $connections,
  fn: (connections, chainId) => ({
    ...connections[chainId],
    connectionType: ConnectionType.DISABLED,
  }),
  target: updateConnectionFx,
});

sample({
  clock: disconnectStarted,
  source: { providers: $providers, apis: $apis },
  filter: ({ providers, apis }, chainId) => Boolean(providers[chainId] && apis[chainId]),
  fn: ({ providers, apis }, chainId) => ({
    provider: providers[chainId],
    api: apis[chainId],
    chainId: chainId,
  }),
  target: disconnectFx,
});

export const networkModel = {
  $chains,
  $apis,
  $connectionStatuses,
  $connections,
  events: {
    chainStarted,
    providerTypeSwitched,
    disconnectStarted,
    lightClientSelected,
    autoBalanceSelected,
    singleNodeSelected,

    rpcNodeAdded,
    rpcNodeUpdated,
    rpcNodeRemoved,
  },
};
