import { createEffect, createEvent, sample, attach } from 'effector';
import { spread, delay } from 'patronum';

import { networkModel, networkUtils } from '@entities/network';
import { ChainId, Connection, ConnectionType, RpcNode } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { ProviderWithMetadata } from '@shared/api/network';

const lightClientSelected = createEvent<ChainId>();
const autoBalanceSelected = createEvent<ChainId>();
const rpcNodeSelected = createEvent<{ chainId: ChainId; node: RpcNode }>();
const chainDisabled = createEvent<ChainId>();

type NodeEventParams = {
  rpcNode: RpcNode;
  chainId: ChainId;
  oldNode?: RpcNode;
};

const rpcNodeAdded = createEvent<NodeEventParams>();
const rpcNodeUpdated = createEvent<NodeEventParams>();
const rpcNodeRemoved = createEvent<NodeEventParams>();

const updateConnectionFx = createEffect((connection: Connection): Promise<Connection | undefined> => {
  return storageService.connections.put(connection);
});

const addRpcNodeFx = attach({ effect: updateConnectionFx });
const removeRpcNodeFx = attach({ effect: updateConnectionFx });

type DisconnectParams = {
  chainId: ChainId;
  providers: Record<ChainId, ProviderWithMetadata>;
};
const disconnectProviderFx = createEffect(async ({ chainId, providers }: DisconnectParams): Promise<ChainId> => {
  await providers[chainId].disconnect();

  providers[chainId].on('connected', () => undefined);
  providers[chainId].on('disconnected', () => undefined);
  providers[chainId].on('error', () => undefined);

  return chainId;
});

const reconnectProviderFx = attach({ effect: disconnectProviderFx });

sample({
  clock: rpcNodeAdded,
  source: networkModel.$connections,
  fn: (connections, { chainId, rpcNode }) => {
    const { customNodes, ...rest } = connections[chainId];

    return {
      ...rest,
      customNodes: customNodes.concat(rpcNode),
      activeNode: rpcNode,
    };
  },
  target: addRpcNodeFx,
});

sample({
  clock: rpcNodeUpdated,
  source: networkModel.$connections,
  filter: (_, { oldNode }) => Boolean(oldNode),
  fn: (connections, { chainId, oldNode, rpcNode }) => {
    const { customNodes, ...rest } = connections[chainId];

    const updatedNodes = customNodes.map((node) => {
      const isSameUrl = node.url === oldNode!.url;
      const isSameName = node.name === oldNode!.name;

      return isSameUrl && isSameName ? rpcNode : node;
    });

    return { ...rest, customNodes: updatedNodes };
  },
  target: updateConnectionFx,
});

sample({
  clock: rpcNodeRemoved,
  source: networkModel.$connections,
  fn: (connections, { chainId, rpcNode }) => {
    const { customNodes, ...rest } = connections[chainId];

    const filteredNodes = customNodes.filter((node) => node.url !== rpcNode.url);

    return { ...rest, customNodes: filteredNodes };
  },
  target: removeRpcNodeFx,
});

sample({
  clock: removeRpcNodeFx.done,
  source: networkModel.$chains,
  filter: (chains, { params: connection }) => {
    return connection.customNodes.every((node) => node.url !== connection.activeNode?.url);
  },
  fn: (chains, { params: connection }) => ({
    ...connection,
    activeNode: chains[connection.chainId].nodes[0],
  }),
  target: updateConnectionFx,
});

sample({
  clock: rpcNodeSelected,
  source: networkModel.$connections,
  fn: (connections, { chainId, node }) => ({
    ...connections[chainId],
    connectionType: ConnectionType.RPC_NODE,
    activeNode: node,
  }),
  target: updateConnectionFx,
});

sample({
  clock: lightClientSelected,
  source: networkModel.$connections,
  fn: (connections, chainId) => ({
    ...connections[chainId],
    connectionType: ConnectionType.LIGHT_CLIENT,
    activeNode: undefined,
  }),
  target: updateConnectionFx,
});

sample({
  clock: autoBalanceSelected,
  source: networkModel.$connections,
  fn: (connections, chainId) => ({
    ...connections[chainId],
    connectionType: ConnectionType.AUTO_BALANCE,
    activeNode: undefined,
  }),
  target: updateConnectionFx,
});

sample({
  clock: chainDisabled,
  source: networkModel.$connections,
  fn: (connections, chainId) => ({
    ...connections[chainId],
    connectionType: ConnectionType.DISABLED,
  }),
  target: updateConnectionFx,
});

sample({
  clock: chainDisabled,
  source: networkModel.$providers,
  fn: (providers, chainId) => ({ chainId, providers }),
  target: disconnectProviderFx,
});

sample({
  clock: updateConnectionFx.doneData,
  source: networkModel.$connections,
  filter: (connection) => Boolean(connection),
  fn: (connections, connection) => ({
    ...connections,
    [connection!.chainId]: connection,
  }),
  target: networkModel.$connections,
});

sample({
  clock: updateConnectionFx.doneData,
  source: networkModel.$providers,
  filter: (_, connection) => {
    return Boolean(connection) && networkUtils.isEnabledConnection(connection!);
  },
  fn: (providers, connection) => {
    const chainId = connection!.chainId;

    return providers[chainId] ? { reconnect: { chainId, providers } } : { start: chainId };
  },
  target: spread({
    start: networkModel.events.chainConnected,
    reconnect: reconnectProviderFx,
  }),
});

sample({
  clock: [disconnectProviderFx.doneData, reconnectProviderFx.doneData],
  source: networkModel.$providers,
  fn: (providers, chainId) => {
    const { [chainId]: _, ...rest } = providers;

    return rest;
  },
  target: networkModel.$providers,
});

delay({
  source: reconnectProviderFx.doneData,
  timeout: 500,
  target: networkModel.events.chainConnected,
});

export const manageNetworkModel = {
  events: {
    lightClientSelected,
    autoBalanceSelected,
    rpcNodeSelected,
    chainDisabled,
    rpcNodeAdded,
    rpcNodeUpdated,
    rpcNodeRemoved,
  },
};
