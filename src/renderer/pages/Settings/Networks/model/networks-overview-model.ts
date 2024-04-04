import { sample, combine } from 'effector';

import { ChainId, ConnectionType, RpcNode } from '@shared/core';
import {
  networksFilterModel,
  activeNetworksModel,
  inactiveNetworksModel,
  networkSelectorUtils,
} from '@features/network';
import { ConnectionList } from '@/src/renderer/features/network/NetworkSelector';

sample({
  clock: networksFilterModel.$filteredNetworks,
  target: [activeNetworksModel.events.networksChanged, inactiveNetworksModel.events.networksChanged],
});

const Predicates: Record<
  ConnectionType,
  (data: { type: ConnectionType; node?: RpcNode }, active?: RpcNode) => boolean
> = {
  [ConnectionType.LIGHT_CLIENT]: (data) => data.type === ConnectionType.LIGHT_CLIENT,
  [ConnectionType.AUTO_BALANCE]: (data) => data.type === ConnectionType.AUTO_BALANCE,
  [ConnectionType.DISABLED]: (data) => data.type === ConnectionType.DISABLED,
  [ConnectionType.RPC_NODE]: (data, active) => data.node?.url === active?.url,
};

const $enabledNodeListMap = combine(activeNetworksModel.$activeNetworks, (list) => {
  return list.reduce<Record<ChainId, { nodes: ConnectionList[]; selectedNode?: ConnectionList }>>((acc, item) => {
    const nodes = networkSelectorUtils.getConnectionsList(item);
    const selectedNode = nodes.find((node) =>
      Predicates[item.connection.connectionType]({ type: node.type, node: node.node }, item.connection.activeNode),
    );

    acc[item.chainId] = { nodes, selectedNode };

    return acc;
  }, {});
});

const $disabledNodeListMap = combine(inactiveNetworksModel.$inactiveNetworks, (list) => {
  return list.reduce<Record<ChainId, { nodes: ConnectionList[]; selectedNode?: ConnectionList }>>((acc, item) => {
    const nodes = networkSelectorUtils.getConnectionsList(item);
    const selectedNode = nodes.find((node) => node.type === item.connection.connectionType);

    acc[item.chainId] = { nodes, selectedNode };

    return acc;
  }, {});
});

export const networksOverviewModel = {
  $enabledNodeListMap,
  $disabledNodeListMap,
};
