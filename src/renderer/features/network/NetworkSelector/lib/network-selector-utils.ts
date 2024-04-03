import { ExtendedChain } from '@entities/network';
import { ConnectionType, RpcNode } from '@shared/core';
import type { ConnectionOptions, SelectorPayload } from './types';

export const networkSelectorUtils = {
  getConnectionOptions,
  getConnectionsList,
};

// function getConnectionOptions(networkItem: ExtendedChain): ConnectionOptions {
//   const { connection, nodes } = networkItem;
//   const { canUseLightClient, connectionType, activeNode, customNodes } = connection;
//
//   const actionNodes = [
//     ...(canUseLightClient ? [{ type: ConnectionType.LIGHT_CLIENT }] : []),
//     { type: ConnectionType.AUTO_BALANCE },
//     { type: ConnectionType.DISABLED },
//   ];
//
//   const networkNodes = nodes.concat(customNodes || []).map((node) => ({ type: ConnectionType.RPC_NODE, node }));
//
//   const Predicates: Record<ConnectionType, (n: SelectorPayload) => boolean> = {
//     [ConnectionType.LIGHT_CLIENT]: (data) => data.type === ConnectionType.LIGHT_CLIENT,
//     [ConnectionType.AUTO_BALANCE]: (data) => data.type === ConnectionType.AUTO_BALANCE,
//     [ConnectionType.DISABLED]: (data) => data.type === ConnectionType.DISABLED,
//     [ConnectionType.RPC_NODE]: (data) => data.node?.url === activeNode?.url,
//   };
//   const allNodes = [...actionNodes, ...networkNodes];
//
//   const isCustomNode = (url: string): boolean => {
//     return customNodes && customNodes.some((node) => node.url === url);
//   };
//
//   return {
//     availableNodes: allNodes,
//     activeNode,
//     selectedNode: allNodes.find(Predicates[connectionType]),
//     isCustomNode,
//   };
// }

type X = {
  type: ConnectionType;
  node?: RpcNode;
  isCustom?: boolean;
};
function getConnectionsList(networkItem: ExtendedChain): X[] {
  const { connection, nodes } = networkItem;
  const { canUseLightClient, customNodes } = connection;

  const actionNodes = [
    ...(canUseLightClient ? [{ type: ConnectionType.LIGHT_CLIENT }] : []),
    { type: ConnectionType.AUTO_BALANCE },
    { type: ConnectionType.DISABLED },
  ];

  const customs = (customNodes || []).map((node) => ({ node, type: ConnectionType.RPC_NODE, isCustom: true }));
  const nodesWithType = nodes.map((node) => ({ node, type: ConnectionType.RPC_NODE, isCustom: false }));

  return [...actionNodes, ...nodesWithType, ...customs];
}
