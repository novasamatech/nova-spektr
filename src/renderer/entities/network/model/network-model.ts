import { createEffect, createEvent, createStore, forward, sample, scopeBind } from 'effector';
import { ApiPromise } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { UnsubscribePromise } from '@polkadot/api/types';
import { cloneDeep, keyBy } from 'lodash';

import { Metadata, ProviderType, chainsService, networkService } from '../lib';
import { Chain, ChainId, Connection, ConnectionStatus, ConnectionType, RpcNode } from '@shared/core';
import { useMetadata } from '../lib/metadataService';
import { storageService } from '@shared/api/storage';

const chains = chainsService.getChainsMap({ sort: true });

const defaultStatuses = Object.values(chains).reduce((acc, chain) => {
  acc[chain.chainId] = ConnectionStatus.DISCONNECTED;

  return acc;
}, {} as Record<ChainId, ConnectionStatus>);

const metadataStorage = useMetadata();

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

const rpcNodeAdded = createEvent<NodeEventParams>();
const rpcNodeUpdated = createEvent<NodeEventParams>();
const rpcNodeRemoved = createEvent<NodeEventParams>();

const connected = createEvent<ChainId>();
const disconnected = createEvent<ChainId>();
const failed = createEvent<ChainId>();

const metadataUnsubscribed = createEvent<ChainId>();

type ProviderTypeSwitchedParams = {
  chainId: ChainId;
  type: ProviderType;
};
const providerTypeSwitched = createEvent<ProviderTypeSwitchedParams>();

const $providers = createStore<Record<ChainId, ProviderInterface>>({});
const $apis = createStore<Record<ChainId, ApiPromise>>({});
const $connectionStatuses = createStore(defaultStatuses);
const $chains = createStore<Record<ChainId, Chain>>(chains);
const $connections = createStore<Record<ChainId, Connection>>({});

const $metadataSubscriptions = createStore<Record<ChainId, UnsubscribePromise>>({});

const populateConnectionsFx = createEffect((): Promise<Connection[]> => {
  return storageService.connections.readAll();
});

const createConnectionFx = createEffect((connection: Omit<Connection, 'id'>): Promise<Connection | undefined> => {
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
  ({
    chainId,
    api,
  }: {
    chainId: ChainId;
    api: ApiPromise;
  }): {
    chainId: ChainId;
    unsubscribe: UnsubscribePromise;
  } => ({
    chainId,
    unsubscribe: metadataStorage.subscribeMetadata(api, () => syncMetadataFx(api)),
  }),
);

const unsubscribeMetadataFx = createEffect(async (unsubscribe: UnsubscribePromise): Promise<void> => {
  const unsubscribeFn = await unsubscribe;

  unsubscribeFn();
});

const syncMetadataFx = createEffect((api: ApiPromise): Promise<Metadata> => {
  return metadataStorage.syncMetadata(api);
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

sample({
  clock: failed,
  source: $connectionStatuses,
  filter: (statuses, chainId) => statuses[chainId] !== ConnectionStatus.ERROR,
  fn: (statuses, chainId) => ({
    ...statuses,
    [chainId]: ConnectionStatus.ERROR,
  }),
  target: $connectionStatuses,
});

const initConnectionsFx = createEffect(async () => {
  for (const chainId of Object.keys(chains)) {
    chainStarted(chainId as ChainId);
  }
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
  providerType: ProviderType;
};
const createProviderFx = createEffect(({ chainId, providerType, nodes }: CreateProviderParams): ProviderInterface => {
  const bindedConnected = scopeBind(connected, { safe: true });
  const bindedDisconnected = scopeBind(disconnected, { safe: true });
  const bindedFailed = scopeBind(failed, { safe: true });

  return networkService.createProvider(
    chainId,
    nodes,
    providerType,
    () => {
      console.info('🟢 provider connected ==> ', chainId);

      bindedConnected(chainId);
    },
    () => {
      console.info('🔶 provider disconnected ==> ', chainId);

      bindedDisconnected(chainId);
    },
    () => {
      console.info('🔴 provider error ==> ', chainId);

      bindedFailed(chainId);
    },
  );
});

type CreateApiParams = {
  chainId: ChainId;
  provider: ProviderInterface;
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

forward({
  from: populateConnectionsFx.done,
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
  fn: ({ connections, chains }, chainId) => {
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
  filter: (_, api) => Boolean(api),
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

sample({ clock: networkStarted, target: populateConnectionsFx });

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
    const isSingleNodeType = connection.connectionType === ConnectionType.RPC_NODE;
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
  filter: (_, connection) => connection.connectionType !== ConnectionType.DISABLED,
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
