import { ExtendedChain, networkUtils } from '@/src/renderer/entities/network';
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

export const getMetrics = (networkList: ExtendedChain[]) =>
  networkList.reduce(
    (acc, network) => {
      network.name === 'Acala' && console.log('Acala', network);
      if (networkUtils.isDisabledConnection(network.connection)) return acc;

      if (networkUtils.isConnectedStatus(network.connectionStatus)) acc.success += 1;
      if (networkUtils.isConnectingStatus(network.connectionStatus)) {
        acc.connecting += 1;
        console.log(acc.connecting, network.name);
      }
      if (networkUtils.isErrorStatus(network.connectionStatus)) acc.error += 1;

      return acc;
    },
    { success: 0, connecting: 0, error: 0 },
  );
