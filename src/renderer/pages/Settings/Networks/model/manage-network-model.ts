import { createEvent, sample, attach } from 'effector';
import { spread } from 'patronum';

import { networkModel, networkUtils } from '@entities/network';
import { ChainId, RpcNode } from '@shared/core';

// TODO: create 2 features for Network selection & Manage custom RPC
type NodeEventParams = {
  rpcNode: RpcNode;
  chainId: ChainId;
  oldNode?: RpcNode;
};

const rpcNodeUpdated = createEvent<NodeEventParams>();
const rpcNodeRemoved = createEvent<NodeEventParams>();

const updateConnectionFx = attach({ effect: networkModel.effects.updateConnectionFx });

const removeRpcNodeFx = attach({ effect: updateConnectionFx });
const reconnectProviderFx = attach({ effect: networkModel.effects.disconnectProviderFx });

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

export const manageNetworkModel = {
  events: {
    rpcNodeUpdated,
    rpcNodeRemoved,
  },
};
