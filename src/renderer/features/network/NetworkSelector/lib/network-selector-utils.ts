import { ConnectionOptions, ExtendedChain, SelectorPayload } from '@entities/network';
import { ConnectionType } from '@shared/core';

export const networkSelectorUtils = {
  getConnectionOptions,
};

function getConnectionOptions(networkItem: ExtendedChain): ConnectionOptions {
  const { connection, nodes } = networkItem;
  const { canUseLightClient, connectionType, activeNode, customNodes } = connection;

  const actionNodes = [
    ...(canUseLightClient ? [{ type: ConnectionType.LIGHT_CLIENT }] : []),
    { type: ConnectionType.AUTO_BALANCE },
    { type: ConnectionType.DISABLED },
  ];

  const networkNodes = nodes.concat(customNodes || []).map((node) => ({ type: ConnectionType.RPC_NODE, node }));

  const Predicates: Record<ConnectionType, (n: SelectorPayload) => boolean> = {
    [ConnectionType.LIGHT_CLIENT]: (data) => data.type === ConnectionType.LIGHT_CLIENT,
    [ConnectionType.AUTO_BALANCE]: (data) => data.type === ConnectionType.AUTO_BALANCE,
    [ConnectionType.DISABLED]: (data) => data.type === ConnectionType.DISABLED,
    [ConnectionType.RPC_NODE]: (data) => data.node?.url === activeNode?.url,
  };
  const allNodes = [...actionNodes, ...networkNodes];

  const isCustomNode = (url: string): boolean => {
    return customNodes && customNodes.some((node) => node.url === url);
  };

  return {
    availableNodes: allNodes,
    activeNode,
    selectedNode: allNodes.find(Predicates[connectionType]),
    isCustomNode,
  };
}
