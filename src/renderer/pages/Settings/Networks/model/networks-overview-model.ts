import { sample, combine } from 'effector';

import { ChainId } from '@shared/core';
import type { ConnectionItem } from '@features/network/NetworkSelector';
import {
  networksFilterModel,
  activeNetworksModel,
  inactiveNetworksModel,
  networkSelectorUtils,
} from '@features/network';
import { Predicates } from '../lib/constants';

type ConnectionMap = {
  [chainId: ChainId]: {
    connections: ConnectionItem[];
    activeConnection?: ConnectionItem
  };
}

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

export const networksOverviewModel = {
  $activeConnectionsMap,
  $inactiveConnectionsMap,
};
