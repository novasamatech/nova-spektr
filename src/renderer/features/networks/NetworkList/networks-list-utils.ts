import { ExtendedChain } from '@/src/renderer/entities/network';
import { Chain, Connection, ConnectionStatus } from '@/src/renderer/shared/core';

export const getExtendedChain = (
  chains: Chain[],
  connections: Record<`0x${string}`, Connection>,
  connectionStatuses: Record<`0x${string}`, ConnectionStatus>,
) => {
  return chains.reduce<ExtendedChain[]>((acc, chain) => {
    const connection = connections[chain.chainId];
    const extendedChain = {
      ...chain,
      connection,
      connectionStatus: connectionStatuses[chain.chainId],
    };

    acc.push(extendedChain);

    return acc;
  }, []);
};
