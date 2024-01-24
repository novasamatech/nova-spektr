import { createEffect, createEvent, createStore, sample, scopeBind } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';
import { cloneDeep, keyBy } from 'lodash';

import { storageService } from '@shared/api/storage';
import { networkUtils } from '../lib/network-utils';
import {
  Chain,
  ChainId,
  Connection,
  ConnectionStatus,
  ConnectionType,
  RpcNode,
  ChainMetadata,
  NoID,
  Metadata,
} from '@shared/core';
import {
  ProviderType,
  chainsService,
  networkService,
  metadataService,
  ProviderWithMetadata,
} from '@shared/api/network';

const networkStarted = createEvent();
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

// TODO: move to it's own feature task - https://app.clickup.com/t/8693mce8u
const rpcNodeAdded = createEvent<NodeEventParams>();
const rpcNodeUpdated = createEvent<NodeEventParams>();
const rpcNodeRemoved = createEvent<NodeEventParams>();

const connected = createEvent<ChainId>();
const disconnected = createEvent<ChainId>();
const failed = createEvent<ChainId>();

const metadataUnsubscribed = createEvent<ChainId>();

const $providers = createStore<Record<ChainId, ProviderWithMetadata>>({});
const $apis = createStore<Record<ChainId, ApiPromise>>({});
const $connectionStatuses = createStore<Record<ChainId, ConnectionStatus>>({});
const $chains = createStore<Record<ChainId, Chain>>({});
const $metadata = createStore<ChainMetadata[]>([]);
const $connections = createStore<Record<ChainId, Connection>>({});

const $metadataSubscriptions = createStore<Record<ChainId, UnsubscribePromise>>({});

const populateChainsFx = createEffect((): Record<ChainId, Chain> => {
  return chainsService.getChainsMap({ sort: true });
});

const populateMetadataFx = createEffect((): Promise<ChainMetadata[]> => {
  return storageService.metadata.readAll();
});

const getDefaultStatusesFx = createEffect((chains: Record<ChainId, Chain>): Record<ChainId, ConnectionStatus> => {
  return Object.values(chains).reduce<Record<ChainId, ConnectionStatus>>((acc, chain) => {
    acc[chain.chainId] = ConnectionStatus.DISCONNECTED;

    return acc;
  }, {});
});

const populateConnectionsFx = createEffect((): Promise<Connection[]> => {
  return storageService.connections.readAll();
});

const createConnectionFx = createEffect((connection: Omit<Connection, 'id'>): Promise<Connection | undefined> => {
  return storageService.connections.create(connection);
});

const updateConnectionFx = createEffect(async ({ id, ...rest }: Connection): Promise<Connection> => {
  if (id) {
    await storageService.connections.update(id, rest);
  } else {
    await storageService.connections.create(rest);
  }

  return { id, ...rest };
});

const deleteConnectionFx = createEffect(async (connectionId: number): Promise<number> => {
  await storageService.connections.delete(connectionId);

  return connectionId;
});

type MetadataSubParams = {
  chainId: ChainId;
  api: ApiPromise;
};
type MetadataSubResult = {
  chainId: ChainId;
  unsubscribe: UnsubscribePromise;
};
const subscribeMetadataFx = createEffect(({ chainId, api }: MetadataSubParams): MetadataSubResult => {
  return {
    chainId,
    unsubscribe: metadataService.subscribeMetadata(api, () => requestMetadataFx(api)),
  };
});

const requestMetadataFx = createEffect((api: ApiPromise): Promise<NoID<ChainMetadata>> => {
  return metadataService.requestMetadata(api);
});

const unsubscribeMetadataFx = createEffect((unsubscribe: UnsubscribePromise) => {
  unsubscribe.then((unsubFn) => unsubFn());
});

const saveMetadataFx = createEffect((metadata: NoID<ChainMetadata>): Promise<ChainMetadata | undefined> => {
  return storageService.metadata.create(metadata);
});

type ProviderMetadataParams = {
  provider: ProviderWithMetadata;
  metadata: Metadata;
};
const updateProviderMetadataFx = createEffect(({ provider, metadata }: ProviderMetadataParams) => {
  provider.updateMetadata(metadata);
});

const initConnectionsFx = createEffect((chains: Record<ChainId, Chain>) => {
  Object.keys(chains).forEach((chainId) => chainStarted(chainId as ChainId));
});

type DisconnectParams = {
  api: ApiPromise;
};
const disconnectFx = createEffect(async ({ api }: DisconnectParams): Promise<void> => {
  await networkService.disconnect(api);
});

type ReconnectParams = {
  api: ApiPromise;
  chainId: ChainId;
};
const reconnectFx = createEffect(async ({ api }: ReconnectParams): Promise<void> => {
  return disconnectFx({ api });
});

type CreateProviderParams = {
  chainId: ChainId;
  nodes: string[];
  metadata?: ChainMetadata;
  providerType: ProviderType;
};
const createProviderFx = createEffect(
  ({ chainId, nodes, metadata, providerType }: CreateProviderParams): ProviderWithMetadata => {
    const boundConnected = scopeBind(connected, { safe: true });
    const boundDisconnected = scopeBind(disconnected, { safe: true });
    const boundFailed = scopeBind(failed, { safe: true });

    return networkService.createProvider(
      chainId,
      providerType,
      { nodes, metadata: metadata?.metadata },
      {
        onConnected: () => {
          console.info('🟢 provider connected ==> ', chainId);
          boundConnected(chainId);
        },
        onDisconnected: () => {
          console.info('🔶 provider disconnected ==> ', chainId);
          boundDisconnected(chainId);
        },
        onError: () => {
          console.info('🔴 provider error ==> ', chainId);
          boundFailed(chainId);
        },
      },
    );
  },
);

type CreateApiParams = {
  chainId: ChainId;
  provider: ProviderWithMetadata;
};
const createApiFx = createEffect(async ({ chainId, provider }: CreateApiParams): Promise<ApiPromise | undefined> => {
  if (!provider.isConnected) {
    setTimeout(() => createApiFx({ chainId, provider }), 1000);

    return;
  }

  try {
    return networkService.createApi(provider);
  } catch (error) {
    console.log(`Create API failed for ${chainId} - `, error);
  }
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
  target: initConnectionsFx,
});

sample({
  clock: chainStarted,
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

    return { chainId, nodes, metadata, providerType };
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
  fn: ({ params, result: provider }) => ({ chainId: params.chainId, provider }),
  target: createApiFx,
});

sample({
  clock: createApiFx.doneData,
  source: $apis,
  filter: (_, api) => Boolean(api),
  fn: (apis, api) => {
    return { ...apis, [api!.genesisHash.toHex()]: api! };
  },
  target: $apis,
});

sample({
  clock: connected,
  source: $connectionStatuses,
  filter: (statuses, chainId) => statuses[chainId] !== ConnectionStatus.CONNECTED,
  fn: (statuses, chainId) => ({ ...statuses, [chainId]: ConnectionStatus.CONNECTED }),
  target: $connectionStatuses,
});

sample({
  clock: disconnected,
  source: $connectionStatuses,
  filter: (statuses, chainId) => statuses[chainId] !== ConnectionStatus.DISCONNECTED,
  fn: (statuses, chainId) => ({ ...statuses, [chainId]: ConnectionStatus.DISCONNECTED }),
  target: $connectionStatuses,
});

sample({
  clock: failed,
  source: $connectionStatuses,
  filter: (statuses, chainId) => statuses[chainId] !== ConnectionStatus.ERROR,
  fn: (statuses, chainId) => ({ ...statuses, [chainId]: ConnectionStatus.ERROR }),
  target: $connectionStatuses,
});

// =====================================================
// ================ Metadata section ===================
// =====================================================

sample({
  clock: connected,
  source: $apis,
  fn: (apis, chainId) => ({
    chainId: chainId,
    api: apis[chainId],
  }),
  target: subscribeMetadataFx,
});

sample({
  clock: disconnectStarted,
  source: $metadataSubscriptions,
  fn: (subscriptions, chainId) => subscriptions[chainId],
  target: unsubscribeMetadataFx,
});

sample({
  clock: disconnectStarted,
  target: metadataUnsubscribed,
});

sample({
  clock: metadataUnsubscribed,
  source: $metadataSubscriptions,
  fn: (subscriptions, chainId) => {
    const { [chainId]: _, ...newSubscriptions } = subscriptions;

    return newSubscriptions;
  },
  target: $metadataSubscriptions,
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

sample({ clock: requestMetadataFx.doneData, target: saveMetadataFx });

sample({
  clock: saveMetadataFx.doneData,
  source: $metadata,
  filter: (_, newMetadata) => Boolean(newMetadata),
  fn: (metadata, newMetadata) => metadata.concat(newMetadata!),
  target: $metadata,
});

sample({
  clock: saveMetadataFx.doneData,
  source: $providers,
  filter: (metadata) => Boolean(metadata),
  fn: (providers, metadata) => ({
    provider: providers[metadata!.chainId],
    metadata: metadata!.metadata,
  }),
  target: updateProviderMetadataFx,
});

// =====================================================
// =============== Connection section ==================
// =====================================================

sample({
  clock: populateConnectionsFx.doneData,
  source: $chains,
  fn: (chains, connections) => {
    const connectionsMap = keyBy(connections, 'chainId');

    return Object.entries(chains).reduce<Record<ChainId, Connection>>((acc, [chainId, chain]) => {
      acc[chain.chainId] = connectionsMap[chainId] || {
        chainId: chain.chainId,
        canUseLightClient: false,
        connectionType: ConnectionType.AUTO_BALANCE,
        customNodes: [],
      };

      return acc;
    }, {});
  },
  target: $connections,
});

sample({
  clock: createConnectionFx.doneData,
  source: $connections,
  filter: (_, connection) => Boolean(connection),
  fn: (connections, connection) => ({
    ...connections,
    [connection!.chainId]: connection,
  }),
  target: $connections,
});

sample({
  clock: updateConnectionFx.doneData,
  source: $connections,
  fn: (connections, connection) => ({
    ...connections,
    [connection.chainId]: connection,
  }),
  target: $connections,
});

sample({
  clock: deleteConnectionFx.doneData,
  source: $connections,
  fn: (connections, connectionId) => {
    const deletedConnection = Object.values(connections).find((c) => c.id === connectionId);
    if (!deletedConnection?.chainId) return connections;

    const { [deletedConnection.chainId]: _, ...newConnections } = connections;

    return newConnections;
  },
  target: $connections,
});

sample({
  clock: rpcNodeAdded,
  source: $connections,
  fn: (connections, { chainId, rpcNode }) => {
    const connection = cloneDeep(connections[chainId]);

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
    const isSingleNodeType = networkUtils.isRpcConnection(connection);
    const activeNode = connection.activeNode;
    const nodes = (connection.customNodes || []).concat(chains[connection.chainId].nodes || []);
    const isNodeFound = nodes.some((node) => node.url === activeNode?.url);

    return isSingleNodeType && !isNodeFound;
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
  fn: (connections, chainId) => ({
    ...connections[chainId],
    connectionType: ConnectionType.LIGHT_CLIENT,
    activeNode: undefined,
  }),
  target: updateConnectionFx,
});

sample({
  clock: autoBalanceSelected,
  source: $connections,
  fn: (connections, chainId) => ({
    ...connections[chainId],
    connectionType: ConnectionType.AUTO_BALANCE,
    activeNode: undefined,
  }),
  target: updateConnectionFx,
});

sample({
  clock: singleNodeSelected,
  source: $connections,
  fn: (connections, { chainId, node }) => ({
    ...connections[chainId],
    connectionType: ConnectionType.RPC_NODE,
    activeNode: node,
  }),
  target: updateConnectionFx,
});

sample({
  clock: updateConnectionFx.doneData,
  source: {
    providers: $providers,
    apis: $apis,
  },
  filter: (_, connection) => networkUtils.isEnabledConnection(connection),
  fn: ({ providers, apis }, connection) => ({
    provider: providers[connection.chainId],
    api: apis[connection.chainId],
    chainId: connection.chainId,
  }),
  target: reconnectFx,
});

sample({
  clock: reconnectFx.done,
  fn: ({ params: { chainId } }) => chainId,
  target: chainStarted,
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
  source: { apis: $apis },
  filter: ({ apis }, chainId) => Boolean(apis[chainId]),
  fn: ({ apis }, chainId) => ({
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
    networkStarted,

    disconnectStarted,
    lightClientSelected,
    autoBalanceSelected,
    singleNodeSelected,

    rpcNodeAdded,
    rpcNodeUpdated,
    rpcNodeRemoved,
  },
};
