import { ExtendedChain } from '@entities/network';
import { ConnectionType } from '@shared/core';
import { ConnectionList } from './types';

export const networkSelectorUtils = {
  getConnectionsList,
};

function getConnectionsList(networkItem: ExtendedChain): ConnectionList[] {
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
