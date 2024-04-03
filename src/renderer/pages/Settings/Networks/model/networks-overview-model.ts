import { sample, combine } from 'effector';

import { ConnectionType, RpcNode } from '@shared/core';
import {
  networksFilterModel,
  activeNetworksModel,
  inactiveNetworksModel,
  networkSelectorUtils,
} from '@features/network';

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

// map with nodes and selected ones
const $enabledNodeListMap = combine(activeNetworksModel.$activeNetworks, (list) => {
  // return list.reduce<{ chainId: ChainId, { node: any[]; selected: any } }>((acc, item) => {
  return list.reduce<any>((acc, item) => {
    const nodes = networkSelectorUtils.getConnectionsList(item);
    const selected = nodes.find((node) =>
      Predicates[item.connection.connectionType](
        { type: item.connection.connectionType, node: node.node },
        item.connection.activeNode,
      ),
    );

    acc[item.chainId] = { nodes, selected };

    return acc;
  }, {});
});

export const networksModel = {
  $enabledNodeListMap,
};
