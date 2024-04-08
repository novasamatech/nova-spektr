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

const $activeConnectionsMap = combine(activeNetworksModel.$activeNetworks, (list) => {
  return list.reduce<Record<ChainId, { nodes: ConnectionItem[]; selectedNode?: ConnectionItem }>>((acc, item) => {
    const nodes = networkSelectorUtils.getConnectionsList(item);
    const selectedNode = nodes.find((node) =>
      Predicates[item.connection.connectionType]({ type: node.type, node: node.node }, item.connection.activeNode),
    );

    acc[item.chainId] = { nodes, selectedNode };

    return acc;
  }, {});
});

const $inactiveConnectionsMap = combine(inactiveNetworksModel.$inactiveNetworks, (list) => {
  return list.reduce<Record<ChainId, { nodes: ConnectionItem[]; selectedNode: ConnectionItem }>>((acc, item) => {
    const nodes = networkSelectorUtils.getConnectionsList(item);
    const selectedNode = nodes.find((node) => node.type === item.connection.connectionType)!;

    acc[item.chainId] = { nodes, selectedNode };

    return acc;
  }, {});
});

sample({
  clock: networksFilterModel.$filteredNetworks,
  target: [activeNetworksModel.events.networksChanged, inactiveNetworksModel.events.networksChanged],
});

export const networksOverviewModel = {
  $activeConnectionsMap,
  $inactiveConnectionsMap,
};
