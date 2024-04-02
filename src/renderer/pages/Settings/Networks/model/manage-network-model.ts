import { createEffect, createEvent, sample, attach } from 'effector';

import { networkModel } from '@entities/network';
import { ChainId, Connection, RpcNode } from '@shared/core';
import { storageService } from '@shared/api/storage';

// TODO: create 2 features for Network selection & Manage custom RPC
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

export const manageNetworkModel = {
  events: {
    rpcNodeAdded,
    rpcNodeUpdated,
    rpcNodeRemoved,
  },
};
