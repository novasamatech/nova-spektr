import { type Chain, type ChainId, type Connection, type ConnectionStatus } from '@/shared/core';
import { type ExtendedChain, networkUtils } from '@/entities/network';

export const networksListUtils = {
  getExtendedChain,
  getStatusMetrics,
};

function getExtendedChain(
  chains: Chain[],
  connections: Record<ChainId, Connection>,
  connectionStatuses: Record<ChainId, ConnectionStatus>,
): ExtendedChain[] {
  return chains.map((chain) => {
    return {
      ...chain,
      connection: connections[chain.chainId],
      connectionStatus: connectionStatuses[chain.chainId],
    };
  }, []);
}

type Metrics = Record<'success' | 'connecting' | 'error', number>;

function getStatusMetrics(networkList: ExtendedChain[]): Metrics {
  const metrics = { connecting: 0, success: 0, error: 0 };

  for (const network of networkList) {
    if (networkUtils.isDisabledConnection(network.connection)) continue;

    if (networkUtils.isConnectedStatus(network.connectionStatus)) metrics.success += 1;
    if (networkUtils.isConnectingStatus(network.connectionStatus)) metrics.connecting += 1;
    if (networkUtils.isDisconnectedStatus(network.connectionStatus)) metrics.connecting += 1;
    if (networkUtils.isErrorStatus(network.connectionStatus)) metrics.error += 1;
  }

  return metrics;
}
