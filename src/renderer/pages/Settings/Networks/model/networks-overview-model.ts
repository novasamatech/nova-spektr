import { combine, sample } from 'effector';

import { type ChainId } from '@shared/core';
import { Predicates } from '../lib/constants';
import { networkModel, networkUtils } from '@entities/network';
import { type ConnectionItem, networkSelectorModel } from '@features/network/NetworkSelector';
import { removeCustomRpcModel } from '@features/network/ManageCustomRpcNode';
import {
  activeNetworksModel,
  addCustomRpcModel,
  editCustomRpcModel,
  inactiveNetworksModel,
  networkSelectorUtils,
  networksFilterModel,
} from '@features/network';

type ConnectionMap = {
  [chainId: ChainId]: {
    connections: ConnectionItem[];
    activeConnection?: ConnectionItem;
  };
};
const $activeConnectionsMap = combine(activeNetworksModel.$activeNetworks, (list) => {
  return list.reduce<ConnectionMap>((acc, item) => {
    const connections = networkSelectorUtils.getConnectionsList(item);
    const activeConnection = connections.find((node) =>
      Predicates[item.connection.connectionType]({ type: node.type, node: node.node }, item.connection.activeNode),
    );

    acc[item.chainId] = { connections, activeConnection };

    return acc;
  }, {});
});

const $inactiveConnectionsMap = combine(inactiveNetworksModel.$inactiveNetworks, (list) => {
  return list.reduce<ConnectionMap>((acc, item) => {
    const connections = networkSelectorUtils.getConnectionsList(item);
    const activeConnection = connections.find((node) => node.type === item.connection.connectionType)!;

    acc[item.chainId] = { connections, activeConnection };

    return acc;
  }, {});
});

sample({
  clock: networksFilterModel.$filteredNetworks,
  target: [activeNetworksModel.events.networksChanged, inactiveNetworksModel.events.networksChanged],
});

sample({
  clock: networksFilterModel.$filteredNetworks,
  target: [activeNetworksModel.events.networksChanged, inactiveNetworksModel.events.networksChanged],
});

sample({
  clock: addCustomRpcModel.output.flowFinished,
  source: networkModel.$connections,
  filter: (connections, { chainId }) => {
    return networkUtils.isEnabledConnection(connections[chainId]);
  },
  fn: (_, data) => data,
  target: networkSelectorModel.events.rpcNodeSelected,
});

sample({
  clock: editCustomRpcModel.output.flowFinished,
  source: networkModel.$connections,
  filter: (connections, { chainId, node }) => {
    const isEnabled = networkUtils.isEnabledConnection(connections[chainId]);
    const isRpc = networkUtils.isRpcConnection(connections[chainId]);
    const activeNode = connections[chainId].activeNode;
    const isEdited = activeNode?.name === node.name && activeNode?.url === node.url;

    return isEnabled && isRpc && isEdited;
  },
  fn: (_, data) => data,
  target: networkSelectorModel.events.rpcNodeSelected,
});

sample({
  clock: removeCustomRpcModel.output.flowFinished,
  source: {
    chains: networkModel.$chains,
    connections: networkModel.$connections,
  },
  filter: ({ connections }, { chainId, node }) => {
    const isEnabled = networkUtils.isEnabledConnection(connections[chainId]);
    const isRpc = networkUtils.isRpcConnection(connections[chainId]);
    const activeNode = connections[chainId].activeNode;
    const isDeleted = activeNode?.name === node.name && activeNode?.url === node.url;

    return isEnabled && isRpc && isDeleted;
  },
  fn: ({ chains }, { chainId }) => ({
    chainId,
    node: chains[chainId].nodes[0],
  }),
  target: networkSelectorModel.events.rpcNodeSelected,
});

export const networksOverviewModel = {
  $activeConnectionsMap,
  $inactiveConnectionsMap,
};
